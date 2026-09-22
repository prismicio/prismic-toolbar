import { h, render } from "preact"
import { act } from "preact/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
	draftPinIdentity,
	type MessageHandler,
	type SubscribeToMessages,
} from "../message-protocol"
import { CommentOverlay } from "./CommentOverlay"

const subscribers = new Set<MessageHandler>()
const postMessage = vi.fn()
const subscribeToMessages: SubscribeToMessages = (handler) => {
	subscribers.add(handler)
	return () => subscribers.delete(handler)
}
let container: HTMLDivElement

const commentState = {
	type: "prismic:embedded-preview:set-comment-overlay",
	placementEnabled: false,
	selectedThreadId: "thread",
	pins: [
		{
			threadId: "thread",
			xRatio: 0.5,
			yRatio: 0.9,
			author: { id: "author", name: "Test Author" },
			resolved: false,
		},
	],
}
const scrollMessage = { type: "prismic:embedded-preview:scroll-to-pin", threadId: "thread" }

function receive(data: unknown) {
	const event = new MessageEvent("message", { data })
	for (const subscriber of subscribers) subscriber(event)
}

beforeEach(() => {
	subscribers.clear()
	postMessage.mockClear()
	vi.stubGlobal("innerWidth", 1000)
	vi.stubGlobal("innerHeight", 800)
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		},
	)
	vi.spyOn(document.documentElement, "offsetWidth", "get").mockReturnValue(1200)
	vi.spyOn(document.documentElement, "offsetHeight", "get").mockReturnValue(2000)
	vi.spyOn(window, "scrollTo").mockImplementation(() => {})
	container = document.createElement("div")
	document.body.append(container)
	act(() => render(h(CommentOverlay, { uiScale: 1, postMessage, subscribeToMessages }), container))
})

afterEach(() => {
	act(() => render(null, container))
	container.remove()
	vi.unstubAllGlobals()
})

describe("comment message subscriptions", () => {
	it("scrolls to the latest pin position after a state update", () => {
		act(() => receive(commentState))
		const pin = container.querySelector<HTMLButtonElement>('[data-thread-id="thread"]')!
		vi.spyOn(pin, "getBoundingClientRect").mockReturnValue(new DOMRect(600, 1800, 32, 32))
		act(() =>
			receive({
				...commentState,
				pins: [{ ...commentState.pins[0], yRatio: 0.7 }],
			}),
		)
		act(() => receive(scrollMessage))
		expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({
			top: 1000,
			left: 100,
			behavior: "smooth",
		})
	})

	it("does not queue scroll requests for pins that do not exist", () => {
		act(() => receive(scrollMessage))
		act(() => receive(commentState))
		expect(window.scrollTo).not.toHaveBeenCalled()
	})

	it("ignores scroll requests for removed pins", () => {
		act(() => receive(commentState))
		act(() => receive({ ...commentState, pins: [] }))
		act(() => receive(scrollMessage))
		expect(window.scrollTo).not.toHaveBeenCalled()
	})

	it("reports an already-visible selected pin directly for every scroll message", () => {
		act(() => receive(commentState))
		const pin = container.querySelector<HTMLButtonElement>('[data-thread-id="thread"]')!
		vi.spyOn(pin, "getBoundingClientRect").mockReturnValue({
			x: 20,
			y: 30,
			top: 30,
			left: 20,
			right: 52,
			bottom: 62,
			width: 32,
			height: 32,
			toJSON: () => ({}),
		})
		postMessage.mockClear()
		act(() => {
			receive(scrollMessage)
			receive(scrollMessage)
			expect(postMessage).toHaveBeenCalledTimes(2)
			expect(postMessage).toHaveBeenLastCalledWith({
				type: "prismic:embedded-preview:report-selected-pin-position",
				pin: { type: "thread", threadId: "thread" },
				rect: { xRatio: 0.02, yRatio: 0.0375, widthRatio: 0.032, heightRatio: 0.04 },
				visible: true,
			})
		})
		expect(window.scrollTo).not.toHaveBeenCalled()
	})

	it("unsubscribes on unmount", () => {
		act(() => receive(commentState))
		act(() => render(null, container))
		expect(subscribers.size).toBe(0)
		postMessage.mockClear()
		window.dispatchEvent(new Event("scroll"))
		document.dispatchEvent(new MouseEvent("click"))
		expect(postMessage).not.toHaveBeenCalled()
	})
})

describe("comment placement", () => {
	it("reports the clicked document position and viewport rectangle", () => {
		act(() => receive({ ...commentState, placementEnabled: true }))
		const placementLayer = container.querySelector<HTMLButtonElement>(
			'[aria-label="Place a comment here"]',
		)!
		postMessage.mockClear()

		act(() => {
			placementLayer.dispatchEvent(
				new MouseEvent("click", { bubbles: true, clientX: 600, clientY: 400 }),
			)
		})

		expect(postMessage).toHaveBeenCalledExactlyOnceWith({
			type: "prismic:embedded-preview:place-comment",
			xRatio: 0.5,
			yRatio: 0.2,
			rect: { xRatio: 0.6, yRatio: 0.5, widthRatio: 0.032, heightRatio: 0.04 },
		})
	})

	it("deselects an existing draft instead of placing another comment", () => {
		act(() =>
			receive({
				...commentState,
				placementEnabled: true,
				draftAuthor: commentState.pins[0].author,
				draftPin: { xRatio: 0.2, yRatio: 0.3 },
			}),
		)
		const placementLayer = container.querySelector<HTMLButtonElement>(
			'[aria-label="Place a comment here"]',
		)!
		postMessage.mockClear()

		act(() => placementLayer.click())

		expect(postMessage).toHaveBeenCalledExactlyOnceWith({
			type: "prismic:embedded-preview:deselect-pin",
			pin: draftPinIdentity,
		})
	})
})

describe("pin selection", () => {
	it("dims resolved pins unless they are selected", () => {
		const resolvedState = {
			...commentState,
			selectedThreadId: undefined,
			pins: [{ ...commentState.pins[0], resolved: true }],
		}
		act(() => receive(resolvedState))
		const pin = container.querySelector<HTMLButtonElement>('[data-thread-id="thread"]')!

		expect(pin.classList.contains("pin-dimmed")).toBe(true)

		act(() => receive({ ...resolvedState, selectedThreadId: "thread" }))
		expect(pin.classList.contains("pin-dimmed")).toBe(false)
	})

	it("keeps selection controlled by the parent until it acknowledges a click", () => {
		act(() => receive({ ...commentState, selectedThreadId: undefined }))
		const pin = container.querySelector<HTMLButtonElement>('[data-thread-id="thread"]')!
		postMessage.mockClear()

		act(() => pin.click())
		act(() => pin.click())
		expect(pin.getAttribute("aria-pressed")).toBe("false")
		expect(postMessage).toHaveBeenCalledTimes(2)
		for (const [message] of postMessage.mock.calls) {
			expect(message).toMatchObject({
				type: "prismic:embedded-preview:select-pin",
				pin: { type: "thread", threadId: "thread" },
			})
		}

		act(() => receive(commentState))
		expect(pin.getAttribute("aria-pressed")).toBe("true")
		postMessage.mockClear()
		act(() => pin.click())
		expect(postMessage).toHaveBeenCalledExactlyOnceWith({
			type: "prismic:embedded-preview:deselect-pin",
			pin: { type: "thread", threadId: "thread" },
		})
		expect(pin.getAttribute("aria-pressed")).toBe("true")

		act(() => receive({ ...commentState, selectedThreadId: undefined }))
		expect(pin.getAttribute("aria-pressed")).toBe("false")
	})
})

describe("selected pin position reporting", () => {
	it("reports only the selected pin and stops when selection is cleared", () => {
		const state = {
			...commentState,
			pins: [...commentState.pins, { ...commentState.pins[0], threadId: "second" }],
		}
		act(() => receive(state))
		expect(postMessage).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ pin: { type: "thread", threadId: "thread" } }),
		)

		postMessage.mockClear()
		act(() => receive({ ...state, selectedThreadId: "second" }))
		expect(postMessage).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ pin: { type: "thread", threadId: "second" } }),
		)
		postMessage.mockClear()
		window.dispatchEvent(new Event("scroll"))
		expect(postMessage).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ pin: { type: "thread", threadId: "second" } }),
		)

		act(() => receive({ ...state, selectedThreadId: undefined }))
		postMessage.mockClear()
		window.dispatchEvent(new Event("scroll"))
		act(() => receive(scrollMessage))
		expect(postMessage).not.toHaveBeenCalled()
	})

	it("reports and deselects only the draft while a draft is present", () => {
		act(() =>
			receive({
				...commentState,
				draftAuthor: commentState.pins[0].author,
				draftPin: { xRatio: 0.2, yRatio: 0.3 },
			}),
		)
		expect(postMessage).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ pin: draftPinIdentity }),
		)
		postMessage.mockClear()
		window.dispatchEvent(new Event("scroll"))
		expect(postMessage).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ pin: draftPinIdentity }),
		)
		postMessage.mockClear()
		document.dispatchEvent(new MouseEvent("click"))
		expect(postMessage).toHaveBeenCalledExactlyOnceWith({
			type: "prismic:embedded-preview:deselect-pin",
			pin: draftPinIdentity,
		})
	})

	it("reports updated geometry when the UI scale or document size changes", () => {
		act(() => receive(commentState))
		const pin = container.querySelector<HTMLButtonElement>('[data-thread-id="thread"]')!
		vi.spyOn(pin, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 30, 64, 64))
		postMessage.mockClear()
		act(() =>
			render(h(CommentOverlay, { uiScale: 2, postMessage, subscribeToMessages }), container),
		)
		expect(postMessage).toHaveBeenCalledExactlyOnceWith({
			type: "prismic:embedded-preview:report-selected-pin-position",
			pin: { type: "thread", threadId: "thread" },
			rect: { xRatio: 0.02, yRatio: 0.0375, widthRatio: 0.064, heightRatio: 0.08 },
			visible: true,
		})

		vi.spyOn(document.documentElement, "offsetHeight", "get").mockReturnValue(3000)
		postMessage.mockClear()
		act(() => {
			window.dispatchEvent(new Event("resize"))
		})
		expect(pin.style.top).toBe("2700px")
		expect(postMessage).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ pin: { type: "thread", threadId: "thread" } }),
		)
	})
})
