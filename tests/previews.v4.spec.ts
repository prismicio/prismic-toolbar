// Websites without `v=5`: every production website today. The toolbar follows the repository's
// preview session through the shell, a page on the repository host that reads its cookies.
import { expect, previewCookieName, test } from "./infra/test"

test("stores the ref in the cookie format older SDKs read", async ({
	repository,
	website,
	startPreview,
}) => {
	await startPreview()
	await expect(website.bar).toBeVisible()

	await expect
		.poll(async () => (await website.cookie(previewCookieName))?.value)
		.toMatch(new RegExp(`^\\{"${repository.host}":\\{"preview":"[^"]+"\\}\\}$`))
	expect((await website.cookie(previewCookieName))?.sameSite).toBe("Lax")
	// The preview route already rendered the session: no reload.
	expect(website.loads).toHaveLength(1)
})

test("follows a preview another tab started, then exited", async ({
	context,
	doc,
	website,
	startPreview,
}) => {
	await website.handleEvents()
	await website.goto(doc)
	await expect(website.payload).toHaveText("Published")
	const otherTab = await context.newPage()

	await startPreview(otherTab)

	await expect(website.payload).toHaveText("Draft 1")
	await expect(website.bar).toBeVisible()
	expect((await website.events())[0]?.[0]).toBe("prismicPreviewStart")

	await website.exit(website.barOf(otherTab))

	await expect(website.payload).toHaveText("Published")
	await expect(website.bar).toHaveCount(0)
	// The session is still active in Prismic, but this tab must not bring it back.
	await website.page.waitForTimeout(4000)
	await expect(website.bar).toHaveCount(0)
	expect(await website.previewRef()).toBeUndefined()
})

test("follows a preview route that stores the ref after the page loaded", async ({
	context,
	repository,
	doc,
	website,
	editor,
}) => {
	await website.goto(doc)
	await expect(website.payload).toHaveText("Published")
	const draft = await repository.updateDraft(doc, { payload: "Draft 1" })

	// Like old Nuxt `usePrismicPreview`: the session starts, then the page stores the raw ref.
	const { ref } = await editor.startSession(context, repository, draft)
	await website.page.evaluate(
		([name, ref]) => (document.cookie = `${name}=${encodeURIComponent(ref!)}; path=/`),
		[previewCookieName, ref],
	)

	await expect(website.payload).toHaveText("Draft 1")
	await expect(website.bar).toBeVisible()
})

test("follows the session when other content is published", async ({
	repository,
	website,
	startPreview,
}) => {
	await website.handleEvents()
	await startPreview()
	await expect(website.bar).toBeVisible()
	const ref = await website.previewRef()

	// Preview refs include the repository's published content.
	await repository.createDocument()

	await expect.poll(() => website.previewRef()).not.toBe(ref)
	expect(await website.events()).toEqual([["prismicPreviewUpdate", await website.previewRef()]])
	await expect(website.payload).toHaveText("Draft 1")
})

// The toolbar cannot tell whether the website renders the cookie's ref, like Next.js outside draft
// mode, so it starts the preview when it bootstraps.
test("starts the preview over an earlier ref of the session", async ({
	context,
	repository,
	doc,
	website,
	editor,
}) => {
	await website.handleEvents()
	const draft = await repository.updateDraft(doc, { payload: "Draft 1" })
	const { url } = await editor.startSession(context, repository, draft)
	// Publishing other content changes the session's ref before the page opens.
	await repository.createDocument()

	await website.page.goto(url)

	await expect(website.bar).toBeVisible()
	expect(await website.events()).toEqual([["prismicPreviewStart", await website.previewRef()]])
})

test("leaves the website's cookie alone when another session ended", async ({
	context,
	repository,
	website,
	editor,
	startPreview,
}) => {
	await startPreview()
	await expect(website.bar).toBeVisible()
	const ref = await website.previewRef()
	const page = website.page.url()
	await website.page.goto("about:blank")
	// Another tab starts a session that then ends: this tab's ref is not that session's.
	const other = await repository.updateDraft(await repository.createDocument(), {
		payload: "Other",
	})
	await editor.startSession(context, repository, other)
	await repository.publish(other)

	await website.page.goto(page)

	// The ended session does not come back, but this tab may still use its ref.
	await website.page.waitForTimeout(4000)
	await expect(website.bar).toHaveCount(0)
	await expect(website.payload).toHaveText("Draft 1")
	expect(await website.previewRef()).toBe(ref)
})
