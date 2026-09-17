import { test, expect } from "@playwright/test"

test("classic toolbar bundle: panels, tabs, collapsibles, JSON tree and preview controls", async ({
	page,
}, testInfo) => {
	const errors = []
	page.on("pageerror", (error) => errors.push(error.message))
	// Exercise copy behavior without writing to the developer's system clipboard.
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			value: {
				writeText: async (text) => {
					window.fixture.copiedText = text
				},
			},
		})
	})
	await page.goto("/toolbar.html")
	await expect(page.locator(".PreviewMenu")).toBeVisible()
	await expect(page.locator("#host-sentinel")).toHaveCSS("color", "rgb(255, 0, 0)")
	await expect(page.locator(".Toolbar")).toHaveCSS("position", "fixed")
	await page.locator("#prismic-toolbar-v2 .Menu").click()
	await expect(page.getByRole("link", { name: /Fixture page/ })).toBeVisible()
	await page.getByRole("tab", { name: "Dev Mode" }).click()
	await page.getByText("page (1)", { exact: true }).click()
	await expect(page.getByText('"Hello"', { exact: true })).toBeVisible()
	await page.locator(".key-object").filter({ hasText: "nested:" }).click()
	await expect(page.getByText('"Nested value"', { exact: true })).toBeVisible()
	const nested = page.locator(".json-view-container").filter({ hasText: '"Nested value"' })
	await nested.hover()
	await nested.getByText("Copy", { exact: true }).click()
	await expect(nested.getByText("Copied", { exact: true })).toBeVisible()
	expect(await page.evaluate(() => window.fixture.copiedText)).toBe("data.nested.value")
	await page.getByRole("heading", { name: "page", exact: true }).click()
	await page.locator(".key-object").filter({ hasText: "page:" }).click()
	await expect(page.getByText('"GraphQL value"', { exact: true })).toBeVisible()
	await page.screenshot({ path: testInfo.outputPath("toolbar-devmode.png") })
	await page.locator(".PreviewMenu .docs").click()
	await expect(page.locator(".PreviewPanel")).toContainText("1 document to preview")
	await page.locator(".PreviewMenu .share").click()
	await expect(page.locator(".SharePanel")).toContainText("https://example.test/share")
	await page.locator(".PreviewMenu > .x").click()
	await expect(page.locator(".PreviewMenu")).toHaveCount(0)
	expect(await page.evaluate(() => window.fixture.ended)).toBe(true)
	expect(errors).toEqual([])
})

test("embedded overlay: handshake, pin selection, placement, scale, scroll and draft", async ({
	page,
}) => {
	const errors = []
	page.on("pageerror", (error) => errors.push(error.message))
	await page.goto("/overlay.html")
	const site = page.frameLocator("iframe")
	const pin = site.locator('[data-thread-id="first"]')
	await expect(pin).toBeVisible()
	await expect(pin).toHaveText("TA") // broken avatar falls back to initials
	await expect(site.locator('[data-thread-id="last"]')).toHaveCSS("opacity", "0.4")
	const highlight = site.locator("#prismic-embedded-preview-overlay").locator(".slice-highlight")
	const firstSlice = site.locator("#first-slice")
	await firstSlice.hover({ position: { x: 400, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
	const badge = highlight.locator(".slice-highlight-badge")
	await expect(badge).toHaveText("first-slice")
	await expect(highlight).toHaveCSS("border-color", "rgb(110, 86, 207)")
	await expect(highlight).toHaveCSS("border-width", "2px")
	await expect(highlight).toHaveCSS("border-radius", "12px")
	await page.evaluate(() => {
		const frame = document.querySelector("iframe")
		frame.contentWindow.postMessage(
			{ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 },
			location.origin,
		)
	})
	await expect(highlight).toHaveCSS("border-width", "4px")
	await expect(highlight).toHaveCSS("border-radius", "24px")
	await expect(badge).toHaveCSS("font-size", "20px")
	const firstSliceBox = await firstSlice.boundingBox()
	const firstHighlightBox = await highlight.boundingBox()
	expect(firstHighlightBox).toEqual(firstSliceBox)
	await firstSlice.evaluate(() => window.scrollBy(0, 50))
	await expect
		.poll(async () => (await highlight.boundingBox())?.y)
		.toBe((firstHighlightBox?.y ?? 0) - 50)
	await site.locator("#outside-slices").hover()
	await expect(highlight).toHaveCount(0)
	await site.locator("#second-slice").hover()
	await expect(highlight).toHaveAttribute("data-slice-id", "second-slice")
	await pin.click()
	await expect(pin).toHaveAttribute("data-selected", "true")
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.fixture.messages.some(
					(message) => message.type === "prismic:embedded-preview:report-selected-pin-position",
				),
			),
		)
		.toBe(true)
	await expect(pin).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)")
	await page.getByRole("button", { name: "Place comment", exact: true }).click()
	await site
		.getByRole("button", { name: "Place a comment here" })
		.click({ position: { x: 400, y: 350 } })
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.fixture.messages.some(
					(message) =>
						message.type === "prismic:embedded-preview:place-comment" &&
						message.xRatio > 0 &&
						message.yRatio > 0,
				),
			),
		)
		.toBe(true)
	await page.getByRole("button", { name: "Place comment", exact: true }).click()
	await page.getByRole("button", { name: "Show draft" }).click()
	await expect(site.getByRole("button", { name: "New comment" })).toBeDisabled()
	await site.getByRole("heading", { name: "Customer content" }).click()
	await expect(site.getByRole("button", { name: "New comment" })).toHaveCount(0)
	await page.getByRole("button", { name: "Scroll to pin" }).click()
	await expect(site.locator('[data-thread-id="last"]')).toBeInViewport()
	await page.getByRole("button", { name: "Update preview ref" }).click()
	await expect
		.poll(() =>
			page
				.context()
				.cookies()
				.then((cookies) => cookies.find((cookie) => cookie.name === "io.prismic.preview")?.value),
		)
		.toBe("test-ref")
	expect(errors).toEqual([])
})

test("inline auth iframe accepts a MessageChannel connection and returns preview state", async ({
	page,
}) => {
	const errors = []
	page.on("pageerror", (error) => errors.push(error.message))
	await page.goto("/auth.html")
	await expect(page.locator("#state")).toContainText('"auth":false')
	await expect(page.locator("#state")).toContainText('"type":"preview_state"')
	expect(errors).toEqual([])
})
