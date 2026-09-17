import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EmbeddedPreviewCookie, setupEmbeddedPreviewPush } from "../../src/toolbar/embedded-preview"

const mocks = vi.hoisted(() => ({ setup: vi.fn(), message: vi.fn(), height: vi.fn() }))
vi.mock("../../src/toolbar/embedded-preview/overlay", () => ({
	EmbeddedPreviewOverlay: class {
		constructor(options: { parentOrigin: string }) {
			mocks.setup(options)
		}
		handleMessage = mocks.message
	},
}))
vi.mock("../../src/toolbar/embedded-preview/document-height", () => ({
	startDocumentHeightReporting: mocks.height,
}))

let listeners: ReturnType<typeof vi.spyOn>
beforeEach(() => {
	vi.clearAllMocks()
	listeners = vi.spyOn(window, "addEventListener")
	vi.spyOn(window.parent, "postMessage").mockImplementation(() => {})
})
afterEach(() => {
	for (const [type, listener] of listeners.mock.calls) {
		if (type === "message") window.removeEventListener(type, listener as EventListener)
	}
	new EmbeddedPreviewCookie().deletePreviewForDomain()
})

function receive(
	data: unknown,
	origin = "http://localhost:5173",
	source: MessageEventSource | null = window.parent,
) {
	window.dispatchEvent(new MessageEvent("message", { data, origin, source }))
}

describe("embedded preview connection", () => {
	it("announces readiness and initializes only once after an allowed parent acknowledgement", () => {
		setupEmbeddedPreviewPush({ preview: { updateFromRef: vi.fn().mockResolvedValue(undefined) } })
		expect(window.parent.postMessage).toHaveBeenCalledWith(
			{ type: "prismic:embedded-preview:ready" },
			"*",
		)
		const ack = { type: "prismic:embedded-preview:ack" }
		receive(ack, "https://prismic.io.evil.example")
		receive(ack, "http://localhost:5173", null)
		expect(mocks.setup).not.toHaveBeenCalled()
		receive(ack)
		receive(ack)
		expect(mocks.setup).toHaveBeenCalledExactlyOnceWith({ parentOrigin: "http://localhost:5173" })
		expect(mocks.height).toHaveBeenCalledTimes(1)
		const message = { type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 }
		receive(message)
		expect(mocks.message).toHaveBeenCalledWith(message)
	})

	it("accepts valid ref updates only from the allowed parent", () => {
		const updateFromRef = vi.fn().mockResolvedValue(undefined)
		setupEmbeddedPreviewPush({ preview: { updateFromRef } })
		const ref = { type: "prismic:embedded-preview:set-ref", token: "preview-token" }
		receive(ref, "https://attacker.example")
		receive(ref, "http://localhost:5173", null)
		receive({ ...ref, token: "" })
		receive({ ...ref, token: 42 })
		expect(updateFromRef).not.toHaveBeenCalled()
		receive(ref)
		expect(updateFromRef).toHaveBeenCalledExactlyOnceWith("preview-token")
	})

	it("changes the preview cookie only when the ref changes", () => {
		const cookie = new EmbeddedPreviewCookie()
		expect(cookie.sync(undefined)).toBe(false)
		expect(cookie.sync("first")).toBe(true)
		expect(cookie.getRefForDomain()).toBe("first")
		expect(cookie.sync("first")).toBe(false)
		expect(cookie.sync("second")).toBe(true)
		expect(cookie.sync(undefined)).toBe(true)
		expect(cookie.getRefForDomain()).toBeUndefined()
	})
})
