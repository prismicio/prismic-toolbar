import Cookies from "js-cookie"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createEmbeddedPush } from "../src/core/embedded-push"
import { claimOwnership, readOwner } from "../src/core/owner-marker"
import { createSiteCookieStore, previewCookieName } from "../src/core/site-cookie"

const repository = "example.prismic.io"

let updates: string[]
let cancelUpdates: boolean
const recordUpdate = (event: Event) => {
	updates.push((event as CustomEvent<{ ref: string }>).detail.ref)
	if (cancelUpdates) event.preventDefault()
}

beforeEach(() => {
	updates = []
	cancelUpdates = false
	window.addEventListener("prismicPreviewUpdate", recordUpdate)
})

afterEach(() => {
	window.removeEventListener("prismicPreviewUpdate", recordUpdate)
})

function setup() {
	const reload = vi.fn()
	const push = createEmbeddedPush({ repositoryHost: repository, reload, now: () => 1234 })
	return { push, reload }
}

describe("refs sent with reload: false", () => {
	it("store the ref, mark it as the editor's, and notify without reloading", async () => {
		Cookies.set(previewCookieName, "bootstrap-token")
		const { push, reload } = setup()

		await push("live-1", false)

		expect(Cookies.get(previewCookieName)).toBe("live-1")
		expect(readOwner()).toEqual({ version: 2, repository, ref: "live-1", at: 1234 })
		expect(updates).toEqual(["live-1"])
		expect(reload).not.toHaveBeenCalled()
	})

	it("ignore repeats until the ref or the cookie changes", async () => {
		const { push } = setup()

		await push("live-1", false)
		await push("live-1", false)
		await push("live-2", false)
		Cookies.set(previewCookieName, "share-link-ref")
		await push("live-2", false)

		expect(updates).toEqual(["live-1", "live-2", "live-2"])
		expect(Cookies.get(previewCookieName)).toBe("live-2")
	})

	it("notify once for a first ref the cookie already holds", async () => {
		Cookies.set(previewCookieName, "live-1")
		const { push } = setup()

		await push("live-1", false)
		await push("live-1", false)

		expect(updates).toEqual(["live-1"])
		expect(readOwner()?.ref).toBe("live-1")
	})
})

describe("refs sent without the flag", () => {
	it("reload when nothing handles the update and release the editor's mark", async () => {
		claimOwnership(repository, "live-1", 1)
		Cookies.set(previewCookieName, "live-1")
		const { push, reload } = setup()

		await push("legacy-1")

		expect(Cookies.get(previewCookieName)).toBe("legacy-1")
		expect(readOwner()).toBeUndefined()
		expect(updates).toEqual(["legacy-1"])
		expect(reload).toHaveBeenCalledOnce()
	})

	it("let the website handle the update", async () => {
		cancelUpdates = true
		const { push, reload } = setup()

		await push("legacy-1")

		expect(updates).toEqual(["legacy-1"])
		expect(reload).not.toHaveBeenCalled()
	})

	it("do nothing when the cookie already holds the ref", async () => {
		Cookies.set(previewCookieName, "legacy-1")
		const { push, reload } = setup()

		await push("legacy-1")

		expect(updates).toEqual([])
		expect(reload).not.toHaveBeenCalled()
	})
})

it("does not reload when the browser rejects the cookie, which would loop", async () => {
	const store = createSiteCookieStore(repository)
	vi.spyOn(store, "writeRef").mockReturnValue(false)
	vi.spyOn(console, "warn").mockImplementation(() => {})
	const reload = vi.fn()
	const push = createEmbeddedPush({ repositoryHost: repository, reload, store })

	await push("legacy-1")
	await push("live-1", false)

	expect(reload).not.toHaveBeenCalled()
	expect(updates).toEqual([])
})
