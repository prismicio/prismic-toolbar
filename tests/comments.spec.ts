import type { Locator } from "@playwright/test"

import { comments, type Editor, expect, test } from "./infra"

test.beforeEach(async ({ editor }) => {
	await editor.goto({ comments })
})

test("shows the editor's comment pins", async ({ editor }) => {
	const pin = editor.preview.locator('[data-thread-id="first"]')

	await expect(pin).toBeVisible()
	// A broken avatar falls back to initials.
	await expect(pin).toHaveText("TA")
	await expect(editor.preview.locator('[data-thread-id="last"]')).toHaveCSS("opacity", "0.4")
})

test("selects a pin through the editor and reports its position", async ({ editor }) => {
	const pin = editor.preview.locator('[data-thread-id="first"]')

	await pin.click()

	await expect(pin).toHaveAttribute("aria-pressed", "true")
	await expectReportedPosition(editor, pin)

	await editor.send({ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 })
	await expect(pin).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)")
	await expectReportedPosition(editor, pin)

	await editor.page.locator("iframe").evaluate((frame) => (frame.style.height = "500px"))
	await expectReportedPosition(editor, pin)
})

test("places a comment where the user clicks", async ({ editor }) => {
	await editor.updateComments({ placementEnabled: true })

	await editor.preview
		.getByRole("button", { name: "Place a comment here" })
		.click({ position: { x: 400, y: 350 } })

	await expect
		.poll(() => editor.messages("place-comment"))
		.toEqual([
			expect.objectContaining({
				xRatio: expect.closeTo(400 / 1280, 2),
				yRatio: expect.any(Number),
			}),
		])
})

test("deselects the draft instead of placing another comment", async ({ editor }) => {
	await editor.updateComments({ draftPin: { xRatio: 0.2, yRatio: 0.1 } })
	await expect(editor.preview.getByRole("button", { name: "New comment" })).toBeDisabled()

	await editor.preview.getByRole("heading", { name: "Customer content" }).click()

	await expect(editor.preview.getByRole("button", { name: "New comment" })).toHaveCount(0)
	expect(await editor.messages("place-comment")).toEqual([])
})

test("scrolls to a pin", async ({ editor }) => {
	const pin = editor.preview.locator('[data-thread-id="last"]')
	await expect(pin).not.toBeInViewport()

	await editor.send({ type: "prismic:embedded-preview:scroll-to-pin", threadId: "last" })

	await expect(pin).toBeInViewport()
})

test("handles a new pin and a scroll to it sent back to back", async ({ editor }) => {
	await expect(editor.preview.locator('[data-thread-id="first"]')).toBeVisible()

	await editor.page.evaluate(() => {
		window.editor.updateComments({
			selectedThreadId: "new-thread",
			pins: [
				{
					threadId: "new-thread",
					xRatio: 0.5,
					yRatio: 0.9,
					author: { id: "author", name: "Test Author" },
					resolved: false,
				},
			],
		})
		window.editor.send({ type: "prismic:embedded-preview:scroll-to-pin", threadId: "new-thread" })
	})

	await expect(editor.preview.locator('[data-thread-id="new-thread"]')).toBeInViewport()
	await expect
		.poll(() => editor.messages("report-selected-pin-position"))
		.toContainEqual(
			expect.objectContaining({
				pin: expect.objectContaining({ threadId: "new-thread" }),
				visible: true,
			}),
		)
})

async function expectReportedPosition(editor: Editor, pin: Locator) {
	const rect = await pin.evaluate((element) => {
		const bounds = element.getBoundingClientRect()
		return {
			xRatio: bounds.left / window.innerWidth,
			yRatio: bounds.top / window.innerHeight,
			widthRatio: bounds.width / window.innerWidth,
			heightRatio: bounds.height / window.innerHeight,
		}
	})
	await expect
		.poll(async () => (await editor.messages("report-selected-pin-position")).at(-1))
		.toMatchObject({ pin: { type: "thread", threadId: "first" }, rect, visible: true })
}
