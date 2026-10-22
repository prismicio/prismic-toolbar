import { expect, previewCookieName, test } from "../infra"

// Websites whose SDK opts into `v=5` run the v5 flow when it stored a session, and nothing
// otherwise.
test.beforeEach(({ website }) => {
	website.scriptQuery += "&v=5"
})

const loaded = (requests: string[], file: string) =>
	requests.some((url) => new URL(url).pathname.endsWith(`/${file}`))

test("starts v5 with only a session", async ({ website, requests }) => {
	await website.storePreview("ref-1", { preview: false })
	await website.goto()

	// The first ping gets the session's ref.
	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toBeVisible()
	expect(website.loads).toEqual([null, "ref-1"])
	expect(loaded(requests, "v5.js")).toBe(true)
	expect(loaded(requests, "toolbar.js")).toBe(false)
	expect(loaded(requests, "iframe.html")).toBe(false)
})

test("starts the preview with the session's first ref", async ({ website }) => {
	await website.storePreview("ref-1", { preview: false })
	await website.goto({ events: "handle" })

	await expect
		.poll(() => website.recordedEvents(), { timeout: 10_000 })
		.toEqual([["prismicPreviewStart", "ref-1"]])
	expect((await website.cookie(previewCookieName))?.value).toBe("ref-1")
	expect(website.loads).toEqual([null])
})

test("does nothing without a session", async ({ repository, website, requests }) => {
	await website.storePreview("ref-1", { session: false })
	await website.page.goto(website.url, { referer: `${repository.url}/previews/s/share-id` })

	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toHaveCount(0)
	expect(requests.map((url) => new URL(url).pathname)).toEqual(["/", "/prismic.js"])
})

test("ignores v=5 in the editor's preview", async ({ editor, requests }) => {
	await editor.goto()

	await expect(editor.overlay).toBeAttached()
	for (const file of ["toolbar.js", "iframe.html", "v5.js"]) {
		expect(loaded(requests, file)).toBe(false)
	}
})

test("ignores v=5 in the editor's poll preview", async ({ repository, website, editor }) => {
	await repository.startPreview("poll-ref")

	await editor.goto({ mode: "poll" })

	await expect.poll(() => repository.pings, { timeout: 10_000 }).toContain("poll-ref")
	expect(website.loads).toEqual([null, "poll-ref"])
	expect((await website.cookie(previewCookieName))?.value).toBe("poll-ref")
})
