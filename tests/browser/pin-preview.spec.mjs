import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
	await page.goto("/overlay.html")
	await expect(page.frameLocator("iframe").locator('[data-thread-id="first"]')).toBeVisible()
})

test("hover reports the pin's current bounds without selecting it", async ({ page }) => {
	const pin = page.frameLocator("iframe").locator('[data-thread-id="first"]')
	await pin.hover()
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
		.poll(() => latestMessage(page, "hover-pin"))
		.toEqual({
			type: "prismic:embedded-preview:hover-pin",
			pin: { type: "thread", threadId: "first" },
			rect,
		})
	await expect(pin).toHaveAttribute("aria-pressed", "false")
	await page.mouse.move(20, 850)
	await expect
		.poll(() => latestMessage(page, "leave-pin"))
		.toMatchObject({
			pin: { type: "thread", threadId: "first" },
		})
	// The editor can retain the card after the pointer leaves the iframe.
	await pin.evaluate(() => window.scrollBy(0, 50))
	await expect.poll(() => latestMessage(page, "dismiss-pin-preview")).toBeTruthy()
	await expect(pin).toHaveAttribute("aria-pressed", "false")
})

test("keyboard focus previews a pin, Escape dismisses it, and Enter still selects it", async ({
	page,
}) => {
	const pin = page.frameLocator("iframe").locator('[data-thread-id="first"]')
	await pin.focus()
	await expect
		.poll(() => latestMessage(page, "hover-pin"))
		.toMatchObject({
			pin: { type: "thread", threadId: "first" },
		})
	await pin.press("Escape")
	await expect.poll(() => latestMessage(page, "dismiss-pin-preview")).toBeTruthy()
	await expect(pin).toHaveAttribute("aria-pressed", "false")
	await pin.press("Enter")
	await expect(pin).toHaveAttribute("aria-pressed", "true")
})

async function latestMessage(page, type) {
	return page.evaluate(
		(type) =>
			window.fixture.messages.findLast(
				(message) => message.type === `prismic:embedded-preview:${type}`,
			),
		type,
	)
}
