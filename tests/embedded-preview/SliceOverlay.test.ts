import { h, render } from "preact"
import { act } from "preact/test-utils"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import type {
	MessageHandler,
	SliceMetadata,
	SubscribeToMessages,
} from "../../src/embedded-preview/message-protocol"
import { SliceOverlay } from "../../src/embedded-preview/overlay/SliceOverlay"

const subscribers = new Set<MessageHandler>()
const postMessage = vi.fn()
const subscribeToMessages: SubscribeToMessages = (handler) => {
	subscribers.add(handler)
	return () => subscribers.delete(handler)
}
let root: ShadowRoot
function receive(data: unknown) {
	act(() => {
		for (const subscriber of subscribers) subscriber(new MessageEvent("message", { data }))
	})
}
function metadata(slices: SliceMetadata[]) {
	receive({ type: "prismic:embedded-preview:set-slices", slices })
}
function overlay(readOnly?: boolean) {
	receive({
		type: "prismic:embedded-preview:set-slice-overlay",
		selectedSliceId: "first",
		readOnly,
	})
}
function button(label: string) {
	return root.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
}

beforeEach(() => {
	subscribers.clear()
	postMessage.mockClear()
	document.body.innerHTML = `
    <!--prismic-slice-start:first--><section id="first"></section><!--prismic-slice-end:first-->
    <!--prismic-slice-start:second--><section id="second"></section><!--prismic-slice-end:second-->
  `
	for (const element of document.querySelectorAll("section")) {
		vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 200, 100))
	}
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
	const host = document.createElement("div")
	root = host.attachShadow({ mode: "open" })
	document.body.append(host)
	act(() => render(h(SliceOverlay, { uiScale: 1, postMessage, subscribeToMessages }), root))
	metadata([
		{ sliceId: "first", label: "Hero", variation: "Default" },
		{ sliceId: "second", label: "Hero", variation: "Centered" },
	])
})

afterEach(() => {
	act(() => render(null, root))
	document.body.replaceChildren()
	vi.unstubAllGlobals()
})

it("requests a variation change for the hovered instance while another is selected", () => {
	overlay(false)
	act(() => {
		document
			.querySelector("#second")!
			.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }))
	})
	const change = root.querySelector<HTMLButtonElement>(
		'[data-slice-id="second"] [aria-label="Change variation"]',
	)!
	act(() => change.click())
	expect(postMessage).toHaveBeenCalledExactlyOnceWith({
		type: "prismic:embedded-preview:change-slice-variation",
		sliceId: "second",
	})
})

it("offers variation changes only for writable shared slices and clears removed controls", () => {
	overlay()
	expect(button("Change variation")).toBeNull()
	overlay(false)
	expect(button("Change variation")).not.toBeNull()
	act(() => button("Change variation")!.click())
	expect(postMessage).toHaveBeenLastCalledWith({
		type: "prismic:embedded-preview:change-slice-variation",
		sliceId: "first",
	})
	overlay(true)
	expect(button("Change variation")).toBeNull()
	overlay(false)
	metadata([{ sliceId: "first", label: "Legacy slice" }])
	expect(button("Change variation")).toBeNull()
	expect(button("Delete slice")).not.toBeNull()
	metadata([])
	expect(button("Delete slice")).toBeNull()
})
