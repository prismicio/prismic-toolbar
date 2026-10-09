import { expect, ownerCookieName, previewCookieName, test } from "../infra"

test("connects to the editor without loading the preview bar or the repository", async ({
	editor,
	context,
}) => {
	const requests: string[] = []
	context.on("request", (request) => requests.push(new URL(request.url()).pathname))

	await editor.goto()

	await expect(editor.overlay).toBeAttached()
	expect(await editor.messages("ready")).toHaveLength(1)
	expect(requests.filter((path) => path.endsWith("/embedded-preview.js"))).toHaveLength(1)
	expect(requests.filter((path) => /\/(toolbar\.js|iframe\.html)$/.test(path))).toEqual([])
})

test("is not loaded outside the editor", async ({ repository, website, context }) => {
	const requests: string[] = []
	context.on("request", (request) => requests.push(new URL(request.url()).pathname))
	await repository.startPreview("ref-1")

	await website.goto()

	await expect(website.previewBar).toBeVisible()
	expect(requests.filter((path) => path.endsWith("/embedded-preview.js"))).toEqual([])
})

test("updates the website in place for refs sent with reload: false", async ({
	repository,
	website,
	editor,
}) => {
	// The website records preview events without handling them.
	website.events = "record"
	await editor.goto()
	await expect(editor.overlay).toBeAttached()

	await editor.send({ type: "prismic:embedded-preview:set-ref", token: "live-1", reload: false })
	await editor.send({ type: "prismic:embedded-preview:set-ref", token: "live-1", reload: false })
	await editor.send({ type: "prismic:embedded-preview:set-ref", token: "live-2", reload: false })

	await expect
		.poll(() => website.recordedEvents(editor.previewFrame))
		.toEqual([
			["prismicPreviewUpdate", "live-1"],
			["prismicPreviewUpdate", "live-2"],
		])
	expect(website.loads).toEqual([null])
	// The editor frames the website cross-site.
	expect(await website.cookie(previewCookieName)).toMatchObject({
		value: "live-2",
		sameSite: "None",
		secure: true,
	})
	// Website tabs read this marker to leave the editor's ref alone.
	expect(JSON.parse((await website.cookie(ownerCookieName))?.value ?? "")).toMatchObject({
		version: 2,
		repository: repository.host,
		ref: "live-2",
	})
})

test("reloads the website for refs sent without reload: false", async ({ website, editor }) => {
	await editor.goto()
	await expect(editor.overlay).toBeAttached()
	await editor.send({ type: "prismic:embedded-preview:set-ref", token: "live-1", reload: false })
	await expect.poll(() => website.previewRef()).toBe("live-1")

	await editor.send({ type: "prismic:embedded-preview:set-ref", token: "legacy-1" })

	await expect(editor.preview.locator("#content")).toHaveText("Draft content: legacy-1")
	expect(website.loads).toEqual([null, "legacy-1"])
	expect(await website.cookie(ownerCookieName)).toBeUndefined()
})

test("follows the preview session in poll mode", async ({ repository, website, editor }) => {
	await repository.startPreview("poll-ref")

	await editor.goto({ mode: "poll" })

	await expect.poll(() => repository.pings, { timeout: 10_000 }).toContain("poll-ref")
	expect(website.loads).toEqual([null, "poll-ref"])
	expect((await website.cookie(previewCookieName))?.value).toBe("poll-ref")

	// The session, not the editor, sets the ref.
	await editor.send({
		type: "prismic:embedded-preview:set-ref",
		token: "editor-ref",
		reload: false,
	})
	await expect
		.poll(() => website.receivedMessages(editor.previewFrame))
		.toContain("prismic:embedded-preview:set-ref")
	expect((await website.cookie(previewCookieName))?.value).toBe("poll-ref")
})

test("stores its cookie on a local website previewed from Prismic", async ({
	repository,
	website,
	editor,
}) => {
	const localWebsite = "http://localhost:3000"
	await repository.startPreview("poll-ref")

	await editor.goto({ mode: "poll", website: localWebsite })

	// A rejected cookie would make every load start the preview and reload again.
	await expect.poll(() => repository.pings, { timeout: 10_000 }).toContain("poll-ref")
	expect(website.loads).toEqual([null, "poll-ref"])
	expect(await website.cookie(previewCookieName, localWebsite)).toMatchObject({
		value: "poll-ref",
		sameSite: "None",
		secure: true,
	})
})

test("ignores editors outside Prismic", async ({ website, editor }) => {
	await editor.goto({ origin: "https://editor.test" })
	await expect.poll(() => editor.messages("ready")).toHaveLength(1)

	await editor.send({
		type: "prismic:embedded-preview:set-ref",
		token: "editor-ref",
		reload: false,
	})

	await expect
		.poll(() => website.receivedMessages(editor.previewFrame))
		.toContain("prismic:embedded-preview:set-ref")
	await expect(editor.overlay).toHaveCount(0)
	expect(await website.cookie(previewCookieName)).toBeUndefined()
})
