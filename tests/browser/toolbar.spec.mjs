import { test, expect } from "@playwright/test"

test("preview bar: title, live status, share link and exit, isolated from page styles", async ({
	page,
}, testInfo) => {
	const errors = []
	page.on("pageerror", (error) => errors.push(error.message))
	// Exercise copying without writing to the developer's system clipboard.
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			value: {
				writeText: async (text) => {
					window.copiedText = text
				},
			},
		})
	})
	await page.goto("/toolbar.html")

	const bar = page.getByRole("region", { name: "Prismic preview" })
	await expect(bar).toContainText("Spring launch")
	await expect(bar).toContainText("Live preview")
	await expect(page.locator("#host-sentinel")).toHaveCSS("color", "rgb(255, 0, 0)")
	await expect(bar.locator(".title")).not.toHaveCSS("color", "rgb(255, 0, 0)")
	await expect(bar.getByRole("link", { name: "Open the repository in Prismic" })).toHaveAttribute(
		"href",
		"https://fixture.prismic.io/",
	)
	await page.screenshot({ path: testInfo.outputPath("preview-bar.png") })

	await bar.getByRole("button", { name: "Copy share link" }).click()
	await expect(bar.getByRole("button", { name: "Link copied" })).toBeVisible()
	expect(await page.evaluate(() => window.copiedText)).toBe(
		"https://fixture.prismic.io/previews/s/abc",
	)

	// When the browser refuses to copy, the link is shown to copy by hand.
	await page.evaluate(() => {
		navigator.clipboard.writeText = async () => {
			throw new Error("Denied")
		}
	})
	await bar.getByRole("button", { name: "Copy share link" }).click()
	await expect(bar.getByRole("textbox", { name: "Share link" })).toHaveValue(
		"https://fixture.prismic.io/previews/s/abc",
	)

	await page.evaluate(() =>
		window.fixture.setSnapshot({ ...window.fixtureSession.getSnapshot(), status: "reloading" }),
	)
	await expect(bar).toContainText("Updating…")

	await bar.getByRole("button", { name: "Exit preview" }).click()
	await expect(bar).toHaveCount(0)
	expect(await page.evaluate(() => window.fixture.exits)).toBe(1)
	expect(errors).toEqual([])
})

test("preview bar for share link visitors offers no share link", async ({ page }) => {
	await page.goto("/toolbar.html?auth=false")

	const bar = page.getByRole("region", { name: "Prismic preview" })
	await expect(bar.getByRole("link", { name: "Powered by Prismic" })).toBeVisible()
	await expect(bar.getByRole("button", { name: "Copy share link" })).toHaveCount(0)
	await expect(bar.getByRole("link", { name: "Open the repository in Prismic" })).toHaveCount(0)
	await expect(bar.getByRole("button", { name: "Exit preview" })).toBeVisible()
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
	const highlight = site.locator("#prismic-embedded-preview-overlay").locator(".slice-highlight")
	const firstSlice = site.locator("#first-slice")
	await firstSlice.hover({ position: { x: 400, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
	await expect(highlight).toHaveCSS("border-color", "rgb(110, 86, 207)")
	await expect(highlight).toHaveCSS("border-width", "2px")
	await expect(highlight).toHaveCSS("border-radius", "12px")
	await firstSlice.click()
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.fixture.messages.some(
					(message) =>
						message.type === "prismic:embedded-preview:select-slice" &&
						message.sliceId === "first-slice",
				),
			),
		)
		.toBe(true)
	await page.evaluate(() => {
		const frame = document.querySelector("iframe")
		frame.contentWindow.postMessage(
			{ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 },
			location.origin,
		)
	})
	await expect(highlight).toHaveCSS("border-width", "4px")
	await expect(highlight).toHaveCSS("border-radius", "24px")
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
	await expect(pin).toHaveAttribute("aria-pressed", "true")
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
	await expectReportedPinPosition(page, pin)
	await page.locator("iframe").evaluate((frame) => (frame.style.height = "500px"))
	await expectReportedPinPosition(page, pin)
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

async function expectReportedPinPosition(page, pin) {
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
		.poll(() =>
			page.evaluate(() =>
				window.fixture.messages.findLast(
					(message) => message.type === "prismic:embedded-preview:report-selected-pin-position",
				),
			),
		)
		.toMatchObject({ pin: { type: "thread", threadId: "first" }, rect, visible: true })
}

test("regular pages do not load embedded preview", async ({ page }) => {
	const requests = []
	const calls = []
	page.on("request", (request) => requests.push(request.url()))
	await mockPreviewService(page, calls)
	await page.goto("/site.html")
	await expect.poll(() => calls).toContain("closeSession")
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
		await expect.poll(() => calls).toContain(active ? "ping" : "closeSession")
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
	await page.exposeFunction("recordPreviewCall", (method) => calls.push(method))
	await page.route("**/prismic-toolbar/*/iframe.html", async (route) => {
		await ready
		await route.fulfill({
			contentType: "text/html",
			body: `<script>
				window.addEventListener("message", (event) => {
					if (event.data?.type !== "prismic-toolbar:connect") return;
					const port = event.ports[0];
					const ref = ${JSON.stringify(ref ?? null)};
					port.onmessage = ({ data: { id, method } }) => {
						window.recordPreviewCall(method);
						const result = method === "getState"
							? (ref ? { isAuthenticated: false, preview: { ref, title: "Fixture" } } : { isAuthenticated: false })
							: method === "ping" ? { ref } : null;
						port.postMessage({ id, result });
					};
					port.postMessage({ type: "prismic-toolbar:ready" });
				});
			</script>`,
		})
	})
}

test("repository iframe answers bridge requests over a MessageChannel", async ({ page }) => {
	const errors = []
	page.on("pageerror", (error) => errors.push(error.message))
	await page.goto("/auth.html")
	// Without session or sign-in cookies, the iframe answers without calling Prismic.
	await expect(page.locator("#state")).toHaveText('{"id":1,"result":{"isAuthenticated":false}}')
	expect(errors).toEqual([])
})

test("editor refs sent with reload: false update a site without listeners in place", async ({
	page,
}) => {
	const siteLoads = []
	page.on("request", (request) => {
		if (new URL(request.url()).pathname === "/site.html") siteLoads.push(request.url())
	})
	// Record updates without cancelling them, like a website that does not handle preview events.
	await page.route("**/site.html", async (route) => {
		const response = await route.fetch()
		await route.fulfill({
			response,
			body: (await response.text()).replace(
				'window.addEventListener("prismicPreviewUpdate", (event) => event.preventDefault())',
				'window.addEventListener("prismicPreviewUpdate", (event) => (window.previewUpdates ||= []).push(event.detail.ref))',
			),
		})
	})
	await page.goto("/overlay.html")
	await expect(page.frameLocator("iframe").locator('[data-thread-id="first"]')).toBeVisible()
	const site = page.frame({ name: "prismic:embedded-preview" })
	const send = (data) =>
		page.evaluate(
			(data) => document.querySelector("iframe").contentWindow.postMessage(data, location.origin),
			data,
		)
	const cookies = async () =>
		Object.fromEntries(
			(await page.context().cookies()).map((cookie) => [
				cookie.name,
				decodeURIComponent(cookie.value),
			]),
		)

	await send({ type: "prismic:embedded-preview:set-ref", token: "live-1", reload: false })
	await send({ type: "prismic:embedded-preview:set-ref", token: "live-1", reload: false })
	await send({ type: "prismic:embedded-preview:set-ref", token: "live-2", reload: false })
	await expect.poll(() => site.evaluate(() => window.previewUpdates)).toEqual(["live-1", "live-2"])
	expect(siteLoads).toHaveLength(1)
	const pushed = await cookies()
	expect(pushed["io.prismic.preview"]).toBe("live-2")
	// Website tabs read this marker to leave the editor's ref alone.
	expect(JSON.parse(pushed["io.prismic.preview.updated"])).toMatchObject({
		version: 2,
		repository: "fixture.prismic.io",
		ref: "live-2",
	})

	// Refs without the flag keep the reload fallback for websites that do not handle the event.
	await send({ type: "prismic:embedded-preview:set-ref", token: "legacy-1" })
	await expect.poll(() => siteLoads).toHaveLength(2)
	const legacy = await cookies()
	expect(legacy["io.prismic.preview"]).toBe("legacy-1")
	expect(legacy["io.prismic.preview.updated"]).toBeUndefined()
})

test("embedded polling on a loopback site in a cross-site editor stores its cookie and settles", async ({
	page,
}) => {
	const calls = []
	const siteLoads = []
	await mockPreviewService(page, calls, "poll-ref")
	// The routed editor page counts as public, so Chromium asks before it frames a local site.
	await page.context().grantPermissions(["local-network-access"])
	// localhost and 127.0.0.1 are different sites, so this frames the site cross-site over plain
	// http, like a local dev server previewed from the hosted editor.
	await page.route("http://127.0.0.1:8082/editor.html", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: '<iframe name="prismic:embedded-preview:poll" src="http://localhost:8082/site.html"></iframe>',
		}),
	)
	page.on("request", (request) => {
		if (request.url() === "http://localhost:8082/site.html") siteLoads.push(request.url())
	})

	await page.goto("http://127.0.0.1:8082/editor.html")

	// A dropped cookie write makes every load sync and reload again, so polling never starts.
	await expect.poll(() => calls, { timeout: 10_000 }).toContain("ping")
	expect(siteLoads).toHaveLength(2)
	expect(
		(await page.context().cookies("http://localhost:8082")).find(
			(cookie) => cookie.name === "io.prismic.preview",
		),
	).toMatchObject({ value: "poll-ref", sameSite: "None", secure: true })
})
