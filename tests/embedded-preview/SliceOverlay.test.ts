import { h, render } from "preact"
import { act } from "preact/test-utils"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import type { MessageHandler } from "../../src/embedded-preview/message-protocol"
import { SliceOverlay } from "../../src/embedded-preview/overlay/SliceOverlay"

const subscribers = new Set<MessageHandler>()
let resize: () => void
let container: HTMLDivElement
let roots: HTMLElement[]

function receive(data: unknown) {
	act(() => {
		for (const subscriber of subscribers) subscriber(new MessageEvent("message", { data }))
	})
}

const select = (selectedSliceId?: string) =>
	receive({ type: "prismic:embedded-preview:set-slice-overlay", selectedSliceId })

const scroll = () => act(() => void window.dispatchEvent(new Event("scroll")))

const highlights = () =>
	[...container.querySelectorAll<HTMLElement>(".slice-highlight")].map(
		(highlight) => `${highlight.dataset.sliceId} at ${highlight.style.top}`,
	)

/** IDs of the slice roots measured since the last call. */
function measured() {
	const ids = roots.filter((root) => vi.mocked(root.getBoundingClientRect).mock.calls.length)
	for (const root of roots) vi.mocked(root.getBoundingClientRect).mockClear()
	return ids.map((root) => root.id)
}

beforeEach(() => {
	subscribers.clear()
	document.body.innerHTML = `
		<!--prismic-slice-start:first--><section id="first"></section><!--prismic-slice-end:first-->
		<!--prismic-slice-start:second--><section id="second"></section><!--prismic-slice-end:second-->
	`
	roots = [...document.querySelectorAll("section")]
	vi.spyOn(roots[0]!, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 400))
	vi.spyOn(roots[1]!, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 400, 800, 300))
	vi.stubGlobal(
		"ResizeObserver",
		class {
			constructor(callback: () => void) {
				resize = callback
			}
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
	vi.stubGlobal("matchMedia", () => ({ matches: true }))
	vi.spyOn(window, "scrollTo").mockImplementation(() => {})
	vi.spyOn(window, "scrollBy").mockImplementation(() => {})
	container = document.createElement("div")
	document.body.append(container)
	act(() =>
		render(
			h(SliceOverlay, {
				postMessage: vi.fn(),
				subscribeToMessages: (handler) => {
					subscribers.add(handler)
					return () => subscribers.delete(handler)
				},
				uiScale: 1,
			}),
			container,
		),
	)
	receive({
		type: "prismic:embedded-preview:set-slices",
		slices: [
			{ sliceId: "first", label: "Hero" },
			{ sliceId: "second", label: "Call to action" },
		],
	})
	measured()
})

afterEach(() => {
	act(() => render(null, container))
	document.body.replaceChildren()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

it("measures no slice while none is highlighted", async () => {
	act(() => {
		window.dispatchEvent(new Event("resize"))
		document.dispatchEvent(new Event("pointermove"))
		resize()
	})
	scroll()
	await act(async () => document.body.append(document.createElement("div")))
	expect(measured()).toEqual([])
	expect(highlights()).toEqual([])
})

it("measures only the selected slice, which follows layout shifts", () => {
	select("second")
	expect(highlights()).toEqual(["second at 400px"])
	measured()

	scroll()
	expect(measured()).toEqual(["second"])

	vi.mocked(roots[1]!.getBoundingClientRect).mockReturnValue(new DOMRect(0, 250, 800, 300))
	act(resize)
	expect(highlights()).toEqual(["second at 250px"])
})

it("measures the hovered slice until the pointer leaves", () => {
	act(() => void roots[0]!.dispatchEvent(new Event("pointerover", { bubbles: true })))
	expect(highlights()).toEqual(["first at 0px"])
	measured()

	scroll()
	expect(measured()).toEqual(["first"])

	act(() => void document.documentElement.dispatchEvent(new Event("pointerleave")))
	scroll()
	expect(highlights()).toEqual([])
	expect(measured()).toEqual([])
})

it("measures a scroll-to target only to scroll to it", () => {
	receive({ type: "prismic:embedded-preview:scroll-to-slice", sliceId: "second" })
	expect(measured()).toEqual(["second"])
	expect(window.scrollBy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: "instant" })

	scroll()
	expect(measured()).toEqual([])
	expect(highlights()).toEqual([])
})

it("keeps hovering a slice whose root is replaced under a still pointer", async () => {
	act(() => {
		const event = new PointerEvent("pointerover", { bubbles: true, clientX: 5, clientY: 5 })
		roots[0]!.dispatchEvent(event)
	})
	const replacement = roots[0]!.cloneNode() as HTMLElement
	vi.spyOn(replacement, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 10, 800, 450))
	document.elementFromPoint = vi.fn(() => replacement)
	await act(async () => roots[0]!.replaceWith(replacement))
	expect(document.elementFromPoint).toHaveBeenCalledWith(5, 5)
	expect(highlights()).toEqual(["first at 10px"])
})
