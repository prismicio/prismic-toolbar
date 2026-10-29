// Websites whose SDK opts into `v=5`. Their preview route stores the session in a first-party
// cookie, which the toolbar follows with Prismic's public `ping`, without the shell.
import { expect, previewCookieName, sessionCookieName, test } from "./infra/test"

test("lets anyone in a preview share it", async ({ website, startPreview }) => {
	await startPreview()

	// v5 does not know whether the visitor is signed in.
	await expect(website.bar.getByRole("button", { name: "Share" })).toBeVisible()
	await expect(website.bar.getByRole("link", { name: "Powered by Prismic" })).toHaveCount(0)
})

test("starts the preview when the website only has the session", async ({
	context,
	website,
	startPreview,
}) => {
	await startPreview()
	await context.clearCookies({ name: previewCookieName })

	await website.page.reload()

	// The first ping gets the session's ref.
	await expect(website.payload).toHaveText("Draft 1")
	await expect(website.bar).toBeVisible()
	expect(await website.previewRef()).toBeDefined()
})

test("lets the website handle the start of a preview", async ({
	context,
	website,
	startPreview,
}) => {
	await website.handleEvents()
	await startPreview()
	await context.clearCookies({ name: previewCookieName })
	await website.page.reload()
	await website.mark()

	await expect(website.payload).toHaveText("Draft 1")
	await website.expectSameLoad()
	const ref = await website.previewRef()
	expect(await website.events()).toEqual([["prismicPreviewStart", ref]])
})

test("ends a preview that has no session", async ({ context, website, startPreview }) => {
	await startPreview()
	await context.clearCookies({ name: sessionCookieName })

	await website.page.reload()

	await expect(website.payload).toHaveText("Published")
	await website.page.reload()
	await expect(website.payload).toHaveText("Published")
})

// The next tests slow down or break Prismic's real `ping` responses, to reach edge cases.

test("retries after failed pings", async ({ context, repository, website, startPreview }) => {
	let failures = 0
	// A network error, then a server error.
	await context.route(
		(url) => url.pathname.endsWith("/ping"),
		(route) => (failures++ ? route.fulfill({ status: 500 }) : route.abort()),
		{ times: 2 },
	)

	const draft = await startPreview()

	await repository.updateDraft(draft, { payload: "Draft 2" })

	await expect(website.payload).toHaveText("Draft 2")
	expect(failures).toBe(2)
})

test("follows the session when Prismic answers slowly", async ({
	context,
	repository,
	website,
	startPreview,
}) => {
	// Slower than the 3 seconds between pings.
	await context.route(
		(url) => url.pathname.endsWith("/ping"),
		async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 4000))
			await route.continue()
		},
	)
	const draft = await startPreview()
	// A tab coming back into view pings right away.
	await website.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")))

	await repository.updateDraft(draft, { payload: "Draft 2" })

	await expect(website.payload).toHaveText("Draft 2", { timeout: 30_000 })
})

test("follows a session another tab started during a ping", async ({
	context,
	repository,
	website,
	editor,
	startPreview,
}) => {
	const draft = await startPreview()
	await expect(website.bar).toBeVisible()
	const session = (await website.cookie(sessionCookieName))!.value
	let release!: () => void
	const released = new Promise<void>((resolve) => (release = resolve))
	const held = new Promise<void>((resolve) => {
		void context.route(
			(url) => url.pathname.includes(`/previews/${encodeURIComponent(session)}/ping`),
			async (route) => {
				resolve()
				await released
				await route.continue()
			},
		)
	})
	await held

	// Another tab previews another page, then this tab's session closes.
	const other = await repository.updateDraft(await repository.createDocument(), {
		payload: "Other",
	})
	await editor.preview(await context.newPage(), repository, other)
	await repository.publish(draft)
	release()

	// This tab follows the new session instead of ending the preview.
	await website.page.waitForTimeout(7000)
	await expect(website.bar).toBeVisible()
})

// v5 keeps one preview session for the whole website, which every repository's toolbar follows. Each
// repository answers with its own ref, so the toolbars take turns rewriting the cookie and reloading.
test.fixme("previews several repositories on one website", async ({
	otherRepository,
	doc,
	website,
	startPreview,
}) => {
	await startPreview()
	const otherDoc = await otherRepository.createDocument({ title: "Autumn sale" })
	const ref = await website.previewRef()

	await website.page.goto(`${website.pageURL(doc)}?with=${otherRepository.domain}/${otherDoc.uid}`)
	await website.page.waitForTimeout(8000)

	expect(website.loads).toHaveLength(2)
	expect(await website.previewRef()).toBe(ref)
})
