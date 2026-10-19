import { expect, previewCookieName, test } from "../infra"

// No SDK opts into the modern flow yet: websites with `v=5` run the legacy flow.
test.beforeEach(({ website }) => {
	website.scriptQuery = "new=true&repo=toolbar-e2e&v=5"
})

test("starts previews through the repository iframe with v=5", async ({ repository, website }) => {
	await repository.startPreview("ref-1")
	await website.goto()

	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toBeVisible()
	expect(website.loads).toEqual([null, "ref-1"])
	expect((await website.cookie(previewCookieName))?.value).toMatch(
		/^\{"_tracker":"\w+","toolbar-e2e\.prismic\.io":\{"preview":"ref-1"\}\}$/,
	)
})

test("ignores v=5 in the editor's preview", async ({ editor, context }) => {
	const requests: string[] = []
	context.on("request", (request) => requests.push(new URL(request.url()).pathname))

	await editor.goto()

	await expect(editor.overlay).toBeAttached()
	expect(await editor.messages("ready")).toHaveLength(1)
	expect(requests.filter((path) => /\/(toolbar\.js|iframe\.html)$/.test(path))).toEqual([])
})

test("ignores v=5 in the editor's poll preview", async ({ repository, website, editor }) => {
	await repository.startPreview("poll-ref")

	await editor.goto({ mode: "poll" })

	await expect.poll(() => repository.pings, { timeout: 10_000 }).toContain("poll-ref")
	expect(website.loads).toEqual([null, "poll-ref"])
	expect((await website.cookie(previewCookieName))?.value).toBe("poll-ref")
})
