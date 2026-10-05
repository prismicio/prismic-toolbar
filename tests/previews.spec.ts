import { expect, ownerCookieName, previewCookieName, test } from "./infra"

test("starts a preview by reloading the page with the session's ref", async ({
	repository,
	website,
}) => {
	await repository.startPreview("ref-1")
	await website.goto()

	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toBeVisible()
	expect(website.loads).toEqual([null, "ref-1"])
	// The tracker comes first: older SDKs read the cookie with a regular expression.
	const cookie = await website.cookie(previewCookieName)
	expect(cookie?.value).toMatch(
		/^\{"_tracker":"\w+","toolbar-e2e\.prismic\.io":\{"preview":"ref-1"\}\}$/,
	)
	expect(cookie?.sameSite).toBe("Lax")
})

test("updates the page when the session's ref changes", async ({ repository, website }) => {
	await repository.startPreview("ref-1")
	await website.goto()
	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toBeVisible()

	repository.ref = "ref-2"

	await expect(website.content).toHaveText("Draft content: ref-2", { timeout: 10_000 })
	expect(repository.pings).toContain("ref-1")
	expect(website.loads).toEqual([null, "ref-1", "ref-2"])
	expect(await website.previewRef()).toBe("ref-2")
})

test("ends the preview when the session ends", async ({ repository, website }) => {
	await repository.startPreview("ref-1")
	await website.goto()
	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toBeVisible()

	repository.ref = null

	await expect(website.content).toHaveText("Published content", { timeout: 10_000 })
	await expect(website.previewBar).toHaveCount(0)
	expect(await website.cookie(previewCookieName)).toBeUndefined()
	expect(await repository.hasSession()).toBe(false)
	expect(website.loads).toEqual([null, "ref-1", null])
})

test("exits the preview, keeping other repositories' previews", async ({
	repository,
	website,
	context,
}) => {
	const otherPreview = { "other.prismic.io": { preview: "other-ref" } }
	await context.addCookies([
		{
			name: previewCookieName,
			value: encodeURIComponent(JSON.stringify(otherPreview)),
			url: website.url,
		},
	])
	await repository.startPreview("ref-1")
	await website.goto()
	await expect(website.content).toHaveText("Draft content: ref-1")

	await website.previewBar.getByRole("button", { name: "Exit preview" }).click()

	await expect(website.content).toHaveText("Published content")
	await expect(website.previewBar).toHaveCount(0)
	expect(JSON.parse((await website.cookie(previewCookieName))?.value ?? "")).toEqual({
		_tracker: expect.any(String),
		...otherPreview,
	})
	expect(await repository.hasSession()).toBe(false)

	// The next visit stays out of the preview.
	await website.page.reload()
	await expect(website.content).toHaveText("Published content")
	await expect(website.previewBar).toHaveCount(0)
	expect(website.loads).toEqual([null, "ref-1", null, null])
})

test("lets the website handle preview events without reloading", async ({
	repository,
	website,
}) => {
	await repository.startPreview("ref-1")
	await website.goto({ events: "handle" })

	await expect.poll(() => website.recordedEvents()).toEqual([["prismicPreviewStart", "ref-1"]])
	await expect(website.previewBar).toBeVisible()
	expect(await website.previewRef()).toBe("ref-1")

	repository.ref = "ref-2"
	await expect
		.poll(() => website.recordedEvents(), { timeout: 10_000 })
		.toContainEqual(["prismicPreviewUpdate", "ref-2"])
	expect(await website.previewRef()).toBe("ref-2")

	await website.previewBar.getByRole("button", { name: "Exit preview" }).click()
	await expect.poll(() => website.recordedEvents()).toContainEqual(["prismicPreviewEnd", null])
	await expect(website.previewBar).toHaveCount(0)
	expect(await website.previewRef()).toBeUndefined()
	expect(website.loads).toEqual([null])
})

test("leaves the preview cookie alone without an active session", async ({
	repository,
	website,
	context,
}) => {
	// Another tab or the editor may own this cookie.
	await context.addCookies([{ name: previewCookieName, value: "another-ref", url: website.url }])
	await repository.startPreview("ref-1")
	repository.ref = null

	await website.goto()

	// The stale session is closed.
	await expect.poll(() => repository.hasSession()).toBe(false)
	await expect(website.content).toHaveText("Draft content: another-ref")
	await expect(website.previewBar).toHaveCount(0)
	expect((await website.cookie(previewCookieName))?.value).toBe("another-ref")
	expect(website.loads).toEqual(["another-ref"])
	expect(repository.pings).toEqual([])
})

test("adopts the cookie of a preview route without reloading", async ({
	repository,
	website,
	context,
}) => {
	// Prismic SDKs' preview routes store the raw ref.
	await context.addCookies([{ name: previewCookieName, value: "ref-1", url: website.url }])
	await repository.startPreview("ref-1")

	await website.goto()

	await expect.poll(() => repository.pings, { timeout: 10_000 }).toContain("ref-1")
	await expect(website.previewBar).toBeVisible()
	expect(JSON.parse((await website.cookie(previewCookieName))?.value ?? "")).toMatchObject({
		[repository.host]: { preview: "ref-1" },
	})
	expect(website.loads).toEqual(["ref-1"])
})

test("follows refs the editor pushes from another tab without overwriting them", async ({
	repository,
	website,
	editor,
	context,
}) => {
	await repository.startPreview("ref-1")
	await website.goto({ events: "handle" })
	await expect.poll(() => website.recordedEvents()).toEqual([["prismicPreviewStart", "ref-1"]])
	await editor.goto({ page: await context.newPage() })
	await expect(editor.overlay).toBeAttached()

	await editor.send({ type: "prismic:embedded-preview:set-ref", token: "editor-1", reload: false })

	await expect
		.poll(() => website.recordedEvents())
		.toContainEqual(["prismicPreviewUpdate", "editor-1"])

	// Polling sees a new session ref, but leaves the editor's ref in place.
	const pings = repository.pings.length
	repository.ref = "ref-2"
	await expect.poll(() => repository.pings.length, { timeout: 10_000 }).toBeGreaterThan(pings + 1)
	expect(await website.previewRef()).toBe("editor-1")
	expect(await website.recordedEvents()).not.toContainEqual(["prismicPreviewUpdate", "ref-2"])

	// Exiting clears the editor's ref too.
	await website.previewBar.getByRole("button", { name: "Exit preview" }).click()
	await expect.poll(() => website.recordedEvents()).toContainEqual(["prismicPreviewEnd", null])
	expect(await website.cookie(previewCookieName)).toBeUndefined()
	expect(await website.cookie(ownerCookieName)).toBeUndefined()
	// Recorded events survive only without a reload.
	expect(await website.recordedEvents()).toEqual([
		["prismicPreviewStart", "ref-1"],
		["prismicPreviewUpdate", "editor-1"],
		["prismicPreviewEnd", null],
	])
})

test("keeps a ref the editor pushed before the page loaded", async ({
	repository,
	website,
	editor,
	context,
}) => {
	await repository.startPreview("ref-1")
	await editor.goto({ page: await context.newPage() })
	await expect(editor.overlay).toBeAttached()
	await editor.send({ type: "prismic:embedded-preview:set-ref", token: "editor-1", reload: false })
	await expect.poll(() => website.previewRef()).toBe("editor-1")
	website.loads.length = 0

	await website.goto({ events: "handle" })

	// The page already renders the editor's ref: no event, no reload.
	await expect.poll(() => repository.pings, { timeout: 10_000 }).toContain("ref-1")
	await expect(website.content).toHaveText("Draft content: editor-1")
	expect(await website.recordedEvents()).toEqual([])
	expect(website.loads).toEqual(["editor-1"])
})
