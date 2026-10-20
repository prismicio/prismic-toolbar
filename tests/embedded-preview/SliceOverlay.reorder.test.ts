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
		{ sliceId: "first", label: "Hero", variation: "Default", canMoveUp: false, canMoveDown: true },
		{
			sliceId: "second",
			label: "Hero",
			variation: "Centered",
			canMoveUp: true,
			canMoveDown: false,
		},
	])
})

afterEach(() => {
	act(() => render(null, root))
	document.body.replaceChildren()
	vi.unstubAllGlobals()
})

it("moves the hovered instance without selecting the slice underneath the controls", () => {
	overlay(false)
	act(() => {
		document
			.querySelector("#second")!
			.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }))
	})
	const up = root.querySelector<HTMLButtonElement>(
		'[data-slice-id="second"] [aria-label="Move slice up"]',
	)!
	const down = root.querySelector<HTMLButtonElement>(
		'[data-slice-id="second"] [aria-label="Move slice down"]',
	)!
	expect(up.disabled).toBe(false)
	expect(down.disabled).toBe(true)
	act(() => down.click())
	expect(postMessage).not.toHaveBeenCalled()
	act(() => up.click())
	expect(postMessage).toHaveBeenCalledExactlyOnceWith({
		type: "prismic:embedded-preview:move-slice",
		sliceId: "second",
		direction: "up",
	})
})

it("updates boundaries without losing the selected controls and respects read-only state", () => {
	overlay()
	expect(button("Move slice up")).toBeNull()
	overlay(false)
	expect(button("Move slice up")!.disabled).toBe(true)
	expect(button("Move slice down")!.disabled).toBe(false)
	act(() => button("Move slice down")!.click())
	expect(postMessage).toHaveBeenLastCalledWith({
		type: "prismic:embedded-preview:move-slice",
		sliceId: "first",
		direction: "down",
	})
	metadata([
		{
			sliceId: "second",
			label: "Hero",
			variation: "Centered",
			canMoveUp: false,
			canMoveDown: true,
		},
		{ sliceId: "first", label: "Hero", variation: "Default", canMoveUp: true, canMoveDown: false },
	])
	expect(root.querySelector('[data-slice-id="first"]')).not.toBeNull()
	expect(button("Move slice up")!.disabled).toBe(false)
	expect(button("Move slice down")!.disabled).toBe(true)

	metadata([
		{ sliceId: "first", label: "Hero", variation: "Default", canMoveUp: false, canMoveDown: false },
	])
	expect(button("Move slice up")!.disabled).toBe(true)
	expect(button("Move slice down")!.disabled).toBe(true)
	metadata([{ sliceId: "first", label: "Hero" }])
	expect(button("Move slice up")!.disabled).toBe(true)
	expect(button("Move slice down")!.disabled).toBe(true)
	overlay(true)
	expect(button("Move slice up")).toBeNull()
	expect(button("Move slice down")).toBeNull()
})
