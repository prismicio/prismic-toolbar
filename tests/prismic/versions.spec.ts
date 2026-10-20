import { expect, previewCookieName, test, type Website } from "../infra"

// Websites whose SDK opts into `v=5` run the modern flow when it stored a session, and the legacy
// flow for previews it could not store a session for.

test.beforeEach(({ website }) => {
	website.scriptQuery += "&v=5"
})

const loaded = (requests: string[], file: string) =>
	requests.some((url) => new URL(url).pathname.endsWith(`/${file}`))

async function expectLegacy(website: Website, requests: string[]) {
	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toBeVisible()
	expect(loaded(requests, "iframe.html")).toBe(true)
	expect(loaded(requests, "modern.js")).toBe(false)
}

test("starts modern with a session", async ({ website, requests }) => {
	await website.storePreview("ref-1")
	await website.goto()

	await expect(website.previewBar).toBeVisible()
	expect(loaded(requests, "modern.js")).toBe(true)
	expect(loaded(requests, "iframe.html")).toBe(false)
})

test("starts legacy with a preview but no session", async ({ repository, website, requests }) => {
	await website.storePreview("ref-1", { session: false })
	await repository.startPreview("ref-1")
	await website.goto()

	await expectLegacy(website, requests)
	expect(website.loads).toEqual(["ref-1"])
})

test("starts legacy when coming from the repository", async ({ repository, website, requests }) => {
	await repository.startPreview("ref-1")
	await website.page.goto(website.url, { referer: `${repository.url}/previews/s/share-id` })

	await expectLegacy(website, requests)
	expect(website.loads).toEqual([null, "ref-1"])
})

test("does nothing without a preview", async ({ repository, website, requests }) => {
	await repository.startPreview("ref-1")
	await website.goto()

	await expect(website.content).toHaveText("Published content")
	await expect(website.previewBar).toHaveCount(0)
	expect(requests).toEqual([
		`${website.url}/`,
		"https://static.cdn.prismic.io/prismic.js?new=true&repo=toolbar-e2e&v=5",
	])
})

test("ignores v=5 in the editor's preview", async ({ editor, requests }) => {
	await editor.goto()

	await expect(editor.overlay).toBeAttached()
	for (const file of ["toolbar.js", "iframe.html", "modern.js"]) {
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
