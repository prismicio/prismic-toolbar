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
	const requests = []
	page.on("request", (request) => requests.push(request.url()))
	let releaseEmbeddedPreview
	const embeddedPreviewRequested = new Promise((resolve) => {
		page.route("**/embedded-preview.js", (route) => {
			releaseEmbeddedPreview = () => route.continue()
			resolve()
		})
	})
	await page.goto("/overlay.html", { waitUntil: "domcontentloaded" })
	await embeddedPreviewRequested
	expect(await page.evaluate(() => window.fixture.messages)).toEqual([])
	await releaseEmbeddedPreview()
	const site = page.frameLocator("iframe")
	const pin = site.locator('[data-thread-id="first"]')
	await expect(pin).toBeVisible()
	await expect(pin).toHaveText("TA") // broken avatar falls back to initials
	await expect(site.locator('[data-thread-id="last"]')).toHaveCSS("opacity", "0.4")
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
	await page.getByRole("button", { name: "Scale overlay" }).click()
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
	expect(requests.filter((url) => url.endsWith("/embedded-preview.js"))).toHaveLength(1)
	expect(requests.some((url) => url.endsWith("/iframe.html"))).toBe(false)
	expect(errors).toEqual([])
})

test("regular pages do not load embedded preview", async ({ page }) => {
	const requests = []
	const calls = []
	page.on("request", (request) => requests.push(request.url()))
	await mockPreviewService(page, calls)
	await page.goto("/site.html")
	await expect.poll(() => calls).toContain("close_preview_session")
	expect(requests.some((url) => url.endsWith("/embedded-preview.js"))).toBe(false)
})

test("embedded overlay handles back-to-back state and scroll messages", async ({ page }) => {
	await page.goto("/overlay.html")
	const site = page.frameLocator("iframe")
	await expect(site.locator('[data-thread-id="first"]')).toBeVisible()

	await page.evaluate(() => {
		const frame = document.querySelector("iframe")
		frame.contentWindow.postMessage(
			{
				type: "prismic:embedded-preview:set-comment-overlay",
				placementEnabled: false,
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
			},
			location.origin,
		)
		frame.contentWindow.postMessage(
			{ type: "prismic:embedded-preview:scroll-to-pin", threadId: "new-thread" },
			location.origin,
		)
	})

	await expect(site.locator('[data-thread-id="new-thread"]')).toBeInViewport()
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.fixture.messages.some(
					(message) =>
						message.type === "prismic:embedded-preview:report-selected-pin-position" &&
						message.pin.threadId === "new-thread" &&
						message.visible,
				),
			),
		)
		.toBe(true)
})

for (const active of [true, false]) {
	test(`embedded polling (${active ? "active" : "inactive"}) stays independent of the editor connection`, async ({
		page,
	}) => {
		const calls = []
		let releaseService
		const serviceReady = new Promise((resolve) => (releaseService = resolve))
		await mockPreviewService(page, calls, active ? "poll-ref" : undefined, serviceReady)
		await page
			.context()
			.addCookies([{ name: "io.prismic.preview", value: "poll-ref", url: "http://localhost:8082" }])
		await page.route("**/overlay.html", async (route) => {
			const response = await route.fetch()
			await route.fulfill({
				response,
				body: (await response.text()).replace(
					'name="prismic:embedded-preview"',
					'name="prismic:embedded-preview:poll"',
				),
			})
		})
		await page.goto("/overlay.html", { waitUntil: "domcontentloaded" })
		await expect(page.frameLocator("iframe").locator('[data-thread-id="first"]')).toBeVisible()
		expect(calls).toEqual([])
		releaseService()
		await expect.poll(() => calls).toContain(active ? "update_preview" : "close_preview_session")
		await page.getByRole("button", { name: "Update preview ref" }).click()
		// A later overlay message proves the preceding set-ref message was processed.
		await page.getByRole("button", { name: "Scale overlay" }).click()
		await expect(page.frameLocator("iframe").locator('[data-thread-id="first"]')).toHaveCSS(
			"transform",
			"matrix(2, 0, 0, 2, 0, 0)",
		)
		expect(
			(await page.context().cookies()).find((cookie) => cookie.name === "io.prismic.preview")
				?.value,
		).toBe("poll-ref")
	})
}

async function mockPreviewService(page, calls, ref, ready = Promise.resolve()) {
	await page.exposeFunction("recordPreviewCall", (type) => calls.push(type))
	await page.route("**/prismic-toolbar/*/iframe.html", async (route) => {
		await ready
		await route.fulfill({
			contentType: "text/html",
			body: `<script>
				window.addEventListener("message", (event) => {
					if (event.data !== "setup_port") return;
					const port = event.ports[0];
					port.onmessage = ({ data: { type } }) => {
						window.recordPreviewCall(type);
						const ref = ${JSON.stringify(ref ?? null)};
						const data = type === "preview_state"
							? { auth: false, preview: { ref } }
							: type === "update_preview" ? { ref, reload: false } : null;
						port.postMessage({ type, data });
					};
					port.postMessage("ready");
				});
			</script>`,
		})
	})
}

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
