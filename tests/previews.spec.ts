// What every website sees, whichever toolbar flow its SDK opts into.
import { expect, test } from "./infra/test"

test("renders the draft of a preview started from Prismic", async ({ website, startPreview }) => {
	await startPreview()

	await expect(website.bar).toContainText("Spring launch")
	await expect(website.bar).toContainText("Live preview")
})

test("loads no preview code without a preview", async ({ doc, website, requests }) => {
	await website.goto(doc)

	await expect(website.payload).toHaveText("Published")
	await website.page.waitForTimeout(2000)
	await expect(website.bar).toHaveCount(0)
	expect(requests.filter((url) => /\/(toolbar|v5|embedded-preview)\.js$/.test(url))).toEqual([])
})

test("loads a single bundle per scenario", async ({ doc, website, startPreview, requests }, {
	project,
}) => {
	const files = () =>
		requests
			.filter((url) => /\/prismic(\.js\?|-toolbar\/)/.test(url))
			.map((url) => new URL(url).pathname.split("/").pop())
	// v4 only knows whether a preview is active once the repository's shell answers.
	const v4 = ["prismic.js", "v4.js", "shell.html"]

	await website.goto(doc)
	await expect(website.payload).toHaveText("Published")
	await website.page.waitForTimeout(2000)
	expect(files()).toEqual(project.name === "v4" ? v4 : ["prismic.js"])

	// Leaving first: v4 would reload this page as the preview cookie arrives, aborting the preview.
	await website.page.goto("about:blank")
	requests.length = 0
	await startPreview()
	await expect(website.bar).toBeVisible()
	expect(new Set(files())).toEqual(new Set(project.name === "v4" ? v4 : ["prismic.js", "v5.js"]))
})

test("reloads the page when the draft changes", async ({ repository, website, startPreview }) => {
	const draft = await startPreview()
	await expect(website.bar).toBeVisible()
	await website.mark()

	await repository.updateDraft(draft, { payload: "Draft 2" })

	await expect(website.payload).toHaveText("Draft 2")
	await expect(website.page.locator("html")).not.toHaveAttribute("data-marker")
})

test("updates in place when the website handles preview events", async ({
	repository,
	website,
	startPreview,
}) => {
	await website.handleEvents()
	const draft = await startPreview()
	await expect(website.bar).toBeVisible()
	await website.mark()

	await repository.updateDraft(draft, { payload: "Draft 2" })

	await expect(website.payload).toHaveText("Draft 2")
	await website.expectSameLoad()
	expect(await website.events()).toEqual([["prismicPreviewUpdate", await website.previewRef()]])
})

test("exits the preview", async ({ website, startPreview }) => {
	await startPreview()

	await website.exit()

	await expect(website.payload).toHaveText("Published")
	await expect(website.bar).toHaveCount(0)
	expect(await website.previewRef()).toBeUndefined()
	// The next visit stays out of the preview.
	await website.page.reload()
	await expect(website.payload).toHaveText("Published")
	await website.page.waitForTimeout(4000)
	await expect(website.bar).toHaveCount(0)
})

test("exits in place when the website handles preview events", async ({
	website,
	startPreview,
}) => {
	await website.handleEvents()
	await startPreview()
	await website.mark()

	await website.exit()

	await expect(website.payload).toHaveText("Published")
	await expect(website.bar).toHaveCount(0)
	await website.expectSameLoad()
	expect(await website.events()).toEqual([["prismicPreviewEnd", null]])
})

test("ends the preview when the session closes in Prismic", async ({
	repository,
	website,
	startPreview,
}) => {
	const draft = await startPreview()
	await expect(website.bar).toBeVisible()

	await repository.publish(draft)

	await expect(website.bar).toHaveCount(0)
	expect(await website.previewRef()).toBeUndefined()
})

test("ends the preview when another tab exits it", async ({ context, website, startPreview }) => {
	await startPreview()
	await expect(website.bar).toBeVisible()
	const otherTab = await context.newPage()
	await otherTab.goto(website.page.url())
	await expect(website.barOf(otherTab)).toBeVisible()

	await website.exit(website.barOf(otherTab))

	await expect(website.payload).toHaveText("Published")
	await expect(website.bar).toHaveCount(0)
})
