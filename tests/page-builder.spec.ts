// The Page Builder previews the website in an iframe, where the toolbar draws its slice and comment
// overlays. With `v=5` too: the editor drives the preview, whatever the website's SDK opts into.
import {
	expect,
	ownerCookieName,
	PageBuilder,
	previewCookieName,
	test,
	Website,
} from "./infra/test"

test.use({ viewport: { width: 1920, height: 1080 } })

test.describe("push", () => {
	test("connects without the preview bar or the shell", async ({ doc, pageBuilder, requests }) => {
		await pageBuilder.open(doc, { mode: "push" })

		await expect(pageBuilder.preview.locator("#prismic-embedded-preview-overlay")).toBeAttached()
		const files = requests.map((url) => new URL(url).pathname.split("/").pop()!)
		expect(files).toContain("embedded-preview.js")
		expect(files.filter((file) => /^(toolbar\.js|v5\.js|shell\.html)$/.test(file))).toEqual([])
		await expect(pageBuilder.preview.getByRole("region", { name: "Prismic preview" })).toHaveCount(
			0,
		)
	})

	test("updates the website in place as the page is edited", async ({
		doc,
		website,
		pageBuilder,
	}) => {
		await website.handleEvents()
		await pageBuilder.open(doc, { mode: "push" })
		await expect.poll(() => website.previewRef()).toBeDefined()
		await website.mark(pageBuilder.frame)

		await pageBuilder.edit("First slice", " edited")

		await expect(pageBuilder.preview.getByText("First slice edited")).toBeVisible()
		await website.expectSameLoad(pageBuilder.frame)
		// The editor frames the website cross-site.
		expect(await website.cookie(previewCookieName)).toMatchObject({
			value: await website.previewRef(),
			sameSite: "None",
			secure: true,
		})
	})

	test("reloads websites that do not handle edits", async ({ doc, website, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		await expect.poll(() => website.previewRef()).toBeDefined()
		await website.mark(pageBuilder.frame)

		await pageBuilder.edit("First slice", " edited")

		await expect(pageBuilder.preview.getByText("First slice edited")).toBeVisible()
		await expect(pageBuilder.preview.locator("html")).not.toHaveAttribute("data-marker")
	})

	test("highlights, labels and selects the editor's slices", async ({ page, doc, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		const [first, second] = doc.content.slices
		const field = page.locator('[contenteditable="true"][aria-label="Text"]')

		await pageBuilder.preview.getByText("Second slice").hover()
		await expect(pageBuilder.slice(second!)).toContainText("TextBlock • Default")
		await pageBuilder.preview.getByText("Second slice").click()
		await expect(field).toHaveText("Second slice")

		await page.getByRole("button", { name: "Close side panel" }).click()
		await pageBuilder.preview.getByText("First slice").click()
		await expect(field).toHaveText("First slice")
		await expect(pageBuilder.slice(first!)).toBeVisible()
	})

	test("moves slices", async ({ doc, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		const [first, second] = doc.content.slices

		const moveUp = { name: "Move slice up" }
		await pageBuilder.preview.getByText("First slice").hover()
		await expect(pageBuilder.slice(first!).getByRole("button", moveUp)).toBeDisabled()
		await pageBuilder.preview.getByText("Second slice").hover()
		await pageBuilder.slice(second!).getByRole("button", moveUp).press("Enter")

		await expect(pageBuilder.preview.locator("section")).toHaveText(["Second slice", "First slice"])
	})

	test("changes slice variations", async ({ page, doc, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		const [, second] = doc.content.slices

		await pageBuilder.preview.getByText("Second slice").hover()
		await pageBuilder
			.slice(second!)
			.getByRole("button", { name: "Change variation" })
			.press("Enter")
		await page.getByRole("button", { name: "TextBlock > Highlighted" }).click()

		await expect(pageBuilder.preview.locator("section.highlighted")).toHaveText("Second slice")
		await pageBuilder.preview.getByText("Second slice").hover()
		await expect(pageBuilder.slice(second!)).toContainText("TextBlock • Highlighted")
	})

	test("adds slices", async ({ page, doc, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		const [first] = doc.content.slices

		await pageBuilder.preview.getByText("First slice").hover()
		await pageBuilder.slice(first!).getByRole("button", { name: "Add slice after" }).press("Enter")
		await page.getByRole("button", { name: "TextBlock > Default" }).click()

		await expect(pageBuilder.preview.locator("section")).toHaveCount(3)
		await expect(pageBuilder.preview.locator("section").first()).toHaveText("First slice")
	})

	test("deletes slices", async ({ doc, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		const [, second] = doc.content.slices

		await pageBuilder.preview.getByText("Second slice").hover()
		await pageBuilder.slice(second!).getByRole("button", { name: "Delete slice" }).press("Enter")

		await expect(pageBuilder.preview.locator("section")).toHaveText(["First slice"])
	})

	test("places comments and selects them from their pins", async ({ page, doc, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		await page.getByRole("radio", { name: "Comments" }).click()

		await pageBuilder.preview
			.getByRole("button", { name: "Place a comment here" })
			.click({ position: { x: 300, y: 300 } })
		await expect(pageBuilder.preview.getByRole("button", { name: "New comment" })).toBeVisible()
		await page.getByRole("textbox", { name: "Composer editor" }).fill("Looks good")
		await page.getByRole("button", { name: "Send" }).click()

		const pin = pageBuilder.preview.getByRole("button", { name: "Open comment by Jane Smith" })
		await expect(pin).toBeVisible()
		await expect(pageBuilder.preview.getByRole("button", { name: "New comment" })).toHaveCount(0)
		await expect(page.getByText("Looks good").first()).toBeVisible()
		// The editor may select the new comment: clicking its pin toggles the selection either way.
		await page.waitForTimeout(3000)
		const selected = await pin.getAttribute("aria-pressed")
		await pin.click()
		await expect(pin).toHaveAttribute("aria-pressed", selected === "true" ? "false" : "true")
	})

	test("places comments over slices without selecting them", async ({ page, doc, pageBuilder }) => {
		await pageBuilder.open(doc, { mode: "push" })
		await page.getByRole("radio", { name: "Comments" }).click()

		// The placement layer covers the page: click where the slice is.
		const slice = (await pageBuilder.preview.getByText("First slice").boundingBox())!
		await page.mouse.click(slice.x + 10, slice.y + 10)

		await expect(pageBuilder.preview.getByRole("button", { name: "New comment" })).toBeVisible()
		await expect(page.locator('[contenteditable="true"][aria-label="Text"]')).toHaveCount(0)
	})

	test("a website tab follows the editor's edits", async ({
		context,
		repository,
		doc,
		website,
		baseURL,
		startPreview,
	}) => {
		await website.handleEvents()
		await startPreview()
		await expect(website.bar).toBeVisible()
		const editor = new PageBuilder(await context.newPage(), repository, baseURL!)
		await editor.open(doc, { mode: "push" })

		await editor.edit("First slice", " edited")

		await expect(website.page.getByText("First slice edited")).toBeVisible()
		expect((await website.events()).map(([type]) => type)).toContain("prismicPreviewUpdate")
		await expect(website.bar).toBeVisible()
	})
})

// Editors with Content API previews push refs with `reload: false`: the website updates in place,
// and website tabs leave the editor's ref alone.
test.describe("push in place", () => {
	test("never reloads the website", async ({ doc, website, pageBuilder }) => {
		await website.handleEvents()
		await pageBuilder.open(doc, { mode: "push", inPlace: true })
		await expect.poll(() => website.previewRef()).toBeDefined()
		await website.mark(pageBuilder.frame)

		await pageBuilder.edit("First slice", " edited")

		await expect(pageBuilder.preview.getByText("First slice edited")).toBeVisible()
		await website.expectSameLoad(pageBuilder.frame)
		const ref = await website.previewRef()
		expect(await website.events(pageBuilder.frame)).toContainEqual(["prismicPreviewUpdate", ref])
		// Website tabs read this marker to leave the editor's ref alone.
		expect(JSON.parse((await website.cookie(ownerCookieName))!.value)).toMatchObject({
			version: 2,
			repository: pageBuilder.repository.host,
			ref,
		})
	})

	test("a website tab follows the editor's ref without overwriting it", async ({
		context,
		repository,
		doc,
		website,
		baseURL,
		startPreview,
	}) => {
		await website.handleEvents()
		await startPreview()
		await expect(website.bar).toBeVisible()
		const editor = new PageBuilder(await context.newPage(), repository, baseURL!)
		await editor.open(doc, { mode: "push", inPlace: true })

		await editor.edit("First slice", " edited")

		await expect(website.page.getByText("First slice edited")).toBeVisible()
		const ref = await website.previewRef()
		expect(await website.events()).toContainEqual(["prismicPreviewUpdate", ref])
		// The tab keeps following the session, but leaves the editor's ref alone.
		await website.page.waitForTimeout(7000)
		expect(await website.previewRef()).toBe(ref)

		// Exiting clears the editor's ref too.
		await website.exit()
		await expect(website.bar).toHaveCount(0)
		expect(await website.cookie(previewCookieName)).toBeUndefined()
		expect(await website.cookie(ownerCookieName)).toBeUndefined()
	})

	test("a website tab keeps a ref the editor pushed before it loaded", async ({
		context,
		doc,
		website,
		pageBuilder,
	}) => {
		await website.handleEvents()
		await pageBuilder.open(doc, { mode: "push", inPlace: true })
		await pageBuilder.edit("First slice", " edited")
		await expect(pageBuilder.preview.getByText("First slice edited")).toBeVisible()
		const tab = new Website(await context.newPage(), website.url, website.repository)

		await tab.goto(doc)

		// The page already renders the editor's ref: no event, no reload.
		await expect(tab.page.getByText("First slice edited")).toBeVisible()
		await tab.page.waitForTimeout(4000)
		expect(await tab.events()).toEqual([])
		expect(tab.loads).toHaveLength(1)
	})
})

test.describe("poll", () => {
	test("follows the preview session", async ({ doc, website, pageBuilder, requests }) => {
		await pageBuilder.open(doc, { mode: "poll" })
		expect(requests.some((url) => url.endsWith("/shell.html"))).toBe(true)

		await pageBuilder.edit("First slice", " edited")

		// The editor saves the draft, and the toolbar follows the session to it.
		await expect(pageBuilder.preview.getByText("First slice edited")).toBeVisible({
			timeout: 30_000,
		})
		// A local website previewed from Prismic must keep its cookie, or every load would reload.
		expect(await website.cookie(previewCookieName)).toMatchObject({
			sameSite: "None",
			secure: true,
		})
		await expect(pageBuilder.preview.getByRole("region", { name: "Prismic preview" })).toHaveCount(
			0,
		)
	})
})

test("ignores editors outside Prismic", async ({ context, doc, website }) => {
	const editor = "https://editor.test"
	await context.grantPermissions(["local-network-access"], { origin: editor })
	await context.route(`${editor}/`, (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<iframe name="prismic:embedded-preview" src="${website.pageURL(doc)}"></iframe>`,
		}),
	)
	await website.page.goto(`${editor}/`)
	const frame = website.page.frameLocator("iframe")
	await expect(frame.getByTestId("payload")).toHaveText("Published")

	// Like the Prismic editor, but from another origin.
	await website.page.evaluate((origin) => {
		const frame = document.querySelector("iframe")!.contentWindow!
		frame.postMessage({ type: "prismic:embedded-preview:ack" }, origin)
		frame.postMessage({ type: "prismic:embedded-preview:set-ref", token: "editor-ref" }, origin)
	}, website.url)

	await website.page.waitForTimeout(2000)
	await expect(frame.locator("#prismic-embedded-preview-overlay")).toHaveCount(0)
	expect(await website.cookie(previewCookieName)).toBeUndefined()
})
