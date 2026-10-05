import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Preview } from "./index"

const mocks = vi.hoisted(() => ({ reloadOrigin: vi.fn() }))
vi.mock("../utils", () => ({ reloadOrigin: mocks.reloadOrigin }))

function createPreview(value?: string) {
	const cookie = {
		value,
		getRefForDomain: () => cookie.value,
		upsertPreviewForDomain: vi.fn((ref: string) => {
			cookie.value = ref
		}),
	}
	const preview = new Preview({ closePreviewSession: async () => {} }, cookie, {})
	return { preview, cookie }
}

let updates: string[]
let cancelUpdates: boolean
const recordUpdate = (event: Event) => {
	updates.push((event as CustomEvent<{ ref: string }>).detail.ref)
	if (cancelUpdates) event.preventDefault()
}

beforeEach(() => {
	updates = []
	cancelUpdates = false
	mocks.reloadOrigin.mockReset()
	window.addEventListener("prismicPreviewUpdate", recordUpdate)
})
afterEach(() => {
	window.removeEventListener("prismicPreviewUpdate", recordUpdate)
})

describe("updateFromRef with reload: false", () => {
	it("stores the ref and notifies the website without reloading, even when unhandled", async () => {
		const { preview, cookie } = createPreview("bootstrap-token")

		await preview.updateFromRef("live-1", false)

		expect(cookie.value).toBe("live-1")
		expect(updates).toEqual(["live-1"])
		expect(mocks.reloadOrigin).not.toHaveBeenCalled()
	})

	it("ignores repeated refs but notifies again for a new ref", async () => {
		const { preview, cookie } = createPreview()

		await preview.updateFromRef("live-1", false)
		await preview.updateFromRef("live-1", false)
		await preview.updateFromRef("live-2", false)

		expect(updates).toEqual(["live-1", "live-2"])
		expect(cookie.upsertPreviewForDomain).toHaveBeenCalledTimes(2)
		expect(mocks.reloadOrigin).not.toHaveBeenCalled()
	})

	it("notifies once for the first ref even when the cookie already holds it", async () => {
		const { preview, cookie } = createPreview("live-1")

		await preview.updateFromRef("live-1", false)
		await preview.updateFromRef("live-1", false)

		expect(updates).toEqual(["live-1"])
		expect(cookie.upsertPreviewForDomain).not.toHaveBeenCalled()
	})

	it("notifies again when the cookie changed behind a repeated ref", async () => {
		const { preview, cookie } = createPreview()

		await preview.updateFromRef("live-1", false)
		cookie.value = "another-tab"
		await preview.updateFromRef("live-1", false)

		expect(cookie.value).toBe("live-1")
		expect(updates).toEqual(["live-1", "live-1"])
	})
})

describe("updateFromRef without reload", () => {
	it("reloads when the ref changes and no handler cancels the update", async () => {
		const { preview, cookie } = createPreview("bootstrap-token")

		await preview.updateFromRef("legacy-1")

		expect(cookie.value).toBe("legacy-1")
		expect(updates).toEqual(["legacy-1"])
		expect(mocks.reloadOrigin).toHaveBeenCalledOnce()
	})

	it("lets a handler cancel the reload", async () => {
		cancelUpdates = true
		const { preview } = createPreview("bootstrap-token")

		await preview.updateFromRef("legacy-1")

		expect(updates).toEqual(["legacy-1"])
		expect(mocks.reloadOrigin).not.toHaveBeenCalled()
	})

	it("does nothing when the cookie already holds the ref", async () => {
		const { preview } = createPreview("legacy-1")

		await preview.updateFromRef("legacy-1")

		expect(updates).toEqual([])
		expect(mocks.reloadOrigin).not.toHaveBeenCalled()
	})
})
