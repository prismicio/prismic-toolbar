import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setupEmbeddedPreview } from "./index"
import { draftPinIdentity, type PostMessage, type SubscribeToMessages } from "./message-protocol"

const mocks = vi.hoisted(() => ({
	setup: vi.fn(),
	message: vi.fn(),
	subscribe: vi.fn(),
}))
vi.mock("./overlay", () => ({
	EmbeddedPreviewOverlay: class {
		constructor(options: { postMessage: PostMessage; subscribeToMessages: SubscribeToMessages }) {
			mocks.setup({ postMessage: options.postMessage })
			mocks.subscribe(options.subscribeToMessages)
			options.subscribeToMessages(mocks.message)
		}
	},
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
})

function receive(
	data: unknown,
	origin = "http://localhost:5173",
	source: MessageEventSource | null = window.parent,
) {
	const event = new MessageEvent("message", { data, origin, source })
	window.dispatchEvent(event)
	return event
}

describe("embedded preview connection", () => {
	it("delivers trusted messages to every subscriber and unsubscribes them independently", async () => {
		const onRef = vi.fn().mockResolvedValue(undefined)
		await setupEmbeddedPreview({ onRef })
		const ack = receive({ type: "prismic:embedded-preview:ack" })
		expect(mocks.message).toHaveBeenCalledExactlyOnceWith(ack)
		mocks.message.mockClear()
		const subscribe: SubscribeToMessages = mocks.subscribe.mock.calls[0][0]
		const first = vi.fn()
		const second = vi.fn()
		const unsubscribeFirst = subscribe(first)
		subscribe(second)
		const ref = { type: "prismic:embedded-preview:set-ref", token: "first" }

		receive(ref, "https://attacker.example")
		receive(ref, "http://localhost:5173", null)
		for (const handler of [first, second, mocks.message, onRef]) {
			expect(handler).not.toHaveBeenCalled()
		}

		const event = receive(ref)
		for (const handler of [first, second, mocks.message]) {
			expect(handler).toHaveBeenCalledExactlyOnceWith(event)
			expect(handler.mock.calls[0][0]).toBe(event)
		}
		expect(onRef).toHaveBeenCalledExactlyOnceWith("first")

		unsubscribeFirst()
		const nextRef = { ...ref, token: "second" }
		const nextEvent = receive(nextRef)
		expect(first).toHaveBeenCalledTimes(1)
		for (const handler of [second, mocks.message]) {
			expect(handler).toHaveBeenCalledTimes(2)
			expect(handler).toHaveBeenLastCalledWith(nextEvent)
		}
		expect(onRef).toHaveBeenCalledTimes(2)
		expect(onRef).toHaveBeenLastCalledWith("second")
	})

	it("announces readiness and initializes once after a valid acknowledgement", async () => {
		const setup = setupEmbeddedPreview()
		expect(window.parent.postMessage).not.toHaveBeenCalled()
		await setup
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
		const message = { type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 }
		const event = receive(message)
		await vi.waitFor(() => {
			expect(mocks.setup).toHaveBeenCalledExactlyOnceWith({
				postMessage: expect.any(Function),
			})
			expect(mocks.message).toHaveBeenCalledWith(event)
		})
	})

	it("binds the overlay sender to the first acknowledged origin and broadcasts later ACK events", async () => {
		await setupEmbeddedPreview()
		const firstAck = receive({ type: "prismic:embedded-preview:ack" }, "https://example.prismic.io")
		const { postMessage }: { postMessage: PostMessage } = mocks.setup.mock.calls[0][0]
		const ack = receive({ type: "prismic:embedded-preview:ack" }, "http://localhost:5173")
		expect(mocks.message).toHaveBeenCalledTimes(2)
		expect(mocks.message).toHaveBeenNthCalledWith(1, firstAck)
		expect(mocks.message).toHaveBeenNthCalledWith(2, ack)
		expect(mocks.setup).toHaveBeenCalledTimes(1)

		const message = {
			type: "prismic:embedded-preview:deselect-pin" as const,
			pin: draftPinIdentity,
		}
		postMessage(message)
		expect(window.parent.postMessage).toHaveBeenLastCalledWith(
			message,
			"https://example.prismic.io",
		)
	})

	it("accepts valid ref updates only from the allowed parent", async () => {
		const updateFromRef = vi.fn().mockResolvedValue(undefined)
		await setupEmbeddedPreview({ onRef: updateFromRef })
		await vi.waitFor(() => {
			expect(window.parent.postMessage).toHaveBeenCalledWith(
				{ type: "prismic:embedded-preview:ready" },
				"*",
			)
		})
		const ref = { type: "prismic:embedded-preview:set-ref", token: "preview-token" }
		receive(ref, "https://attacker.example")
		receive(ref, "http://localhost:5173", null)
		receive({ ...ref, token: "" })
		receive({ ...ref, token: 42 })
		expect(updateFromRef).not.toHaveBeenCalled()
		receive(ref)
		expect(updateFromRef).toHaveBeenCalledExactlyOnceWith("preview-token")
	})

	it("installs the listener before ready, so immediate acknowledgement and state are handled", async () => {
		const message = { type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 }
		let event: MessageEvent<unknown> | undefined
		vi.mocked(window.parent.postMessage).mockImplementation(() => {
			receive({ type: "prismic:embedded-preview:ack" })
			event = receive(message)
		})
		await setupEmbeddedPreview()
		expect(mocks.message).toHaveBeenCalledWith(event)
	})

	it("reports ref update failures", async () => {
		const error = new Error("preview update failed")
		const report = vi.spyOn(console, "error").mockImplementation(() => {})
		await setupEmbeddedPreview({ onRef: vi.fn().mockRejectedValue(error) })
		receive({ type: "prismic:embedded-preview:set-ref", token: "ref" })
		await vi.waitFor(() => {
			expect(report).toHaveBeenCalledWith("Failed to update embedded preview ref.", error)
		})
	})
})
