import { h, render } from "preact"
import { act } from "preact/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
	MessageHandler,
	SubscribeToMessages,
} from "../../src/embedded-preview/message-protocol"
import { SliceOverlay } from "../../src/embedded-preview/overlay/SliceOverlay"
import { useSlices } from "../../src/embedded-preview/overlay/useSlices"

const subscribers = new Set<MessageHandler>()
const subscribeToMessages: SubscribeToMessages = (handler) => {
	subscribers.add(handler)
	return () => subscribers.delete(handler)
}
let resize: () => void
let container: HTMLDivElement
let first: HTMLElement
let second: HTMLElement

function receive(data: unknown) {
	const event = new MessageEvent("message", { data })
	for (const subscriber of subscribers) subscriber(event)
}

function Harness() {
	const { slices, subscribeToLayoutChanges } = useSlices(subscribeToMessages)
	return h(SliceOverlay, {
		postMessage: vi.fn(),
		slices,
		subscribeToLayoutChanges,
		subscribeToMessages,
		uiScale: 1,
	})
}

const highlights = () =>
	[...container.querySelectorAll<HTMLElement>(".slice-highlight")].map((highlight) => ({
		sliceId: highlight.dataset.sliceId,
		top: highlight.style.top,
	}))

function select(selectedSliceId?: string) {
	act(() => receive({ type: "prismic:embedded-preview:set-slice-overlay", selectedSliceId }))
}

function clearMeasurements() {
	vi.mocked(first.getBoundingClientRect).mockClear()
	vi.mocked(second.getBoundingClientRect).mockClear()
}

beforeEach(() => {
	subscribers.clear()
	document.body.innerHTML = `
		<!--prismic-slice-start:first-->
		<section id="first"></section>
		<!--prismic-slice-end:first-->
		<!--prismic-slice-start:second-->
		<section id="second"></section>
		<!--prismic-slice-end:second-->
	`
	first = document.querySelector("#first")!
	second = document.querySelector("#second")!
	vi.spyOn(first, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 400))
	vi.spyOn(second, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 400, 800, 300))
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
	act(() => render(h(Harness, {}), container))
	act(() =>
		receive({
			type: "prismic:embedded-preview:set-slices",
			slices: [
				{ sliceId: "first", label: "Hero" },
				{ sliceId: "second", label: "Call to action" },
			],
		}),
	)
	clearMeasurements()
})

afterEach(() => {
	act(() => render(null, container))
	document.body.replaceChildren()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe("slice measurement", () => {
	it("measures no slice while none is highlighted", async () => {
		act(() => {
			window.dispatchEvent(new Event("scroll"))
			window.dispatchEvent(new Event("resize"))
			document.dispatchEvent(new Event("pointermove"))
			resize()
		})
		await act(async () => {
			document.body.append(document.createElement("div"))
		})
		expect(first.getBoundingClientRect).not.toHaveBeenCalled()
		expect(second.getBoundingClientRect).not.toHaveBeenCalled()
		expect(highlights()).toEqual([])
	})

	it("measures only the selected slice on scroll", () => {
		select("second")
		expect(highlights()).toEqual([{ sliceId: "second", top: "400px" }])
		clearMeasurements()

		act(() => {
			window.dispatchEvent(new Event("scroll"))
		})
		expect(second.getBoundingClientRect).toHaveBeenCalled()
		expect(first.getBoundingClientRect).not.toHaveBeenCalled()
	})

	it("measures the hovered slice until the pointer leaves", () => {
		act(() => {
			first.dispatchEvent(new Event("pointerover", { bubbles: true }))
		})
		expect(highlights()).toEqual([{ sliceId: "first", top: "0px" }])
		clearMeasurements()

		act(() => {
			window.dispatchEvent(new Event("scroll"))
		})
		expect(first.getBoundingClientRect).toHaveBeenCalled()
		expect(second.getBoundingClientRect).not.toHaveBeenCalled()

		act(() => {
			document.documentElement.dispatchEvent(new Event("pointerleave"))
		})
		expect(highlights()).toEqual([])
		clearMeasurements()
		act(() => {
			window.dispatchEvent(new Event("scroll"))
		})
		expect(first.getBoundingClientRect).not.toHaveBeenCalled()
	})

	it("keeps hovering a slice whose root is replaced under a still pointer", async () => {
		act(() => {
			first.dispatchEvent(
				new PointerEvent("pointerover", { bubbles: true, clientX: 5, clientY: 5 }),
			)
		})
		const replacement = first.cloneNode() as HTMLElement
		vi.spyOn(replacement, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 450))
		document.elementFromPoint = vi.fn(() => replacement)
		await act(async () => first.replaceWith(replacement))
		expect(document.elementFromPoint).toHaveBeenCalledWith(5, 5)
		expect(highlights()).toEqual([{ sliceId: "first", top: "0px" }])
		expect(container.querySelector<HTMLElement>(".slice-highlight")?.style.height).toBe("450px")
	})

	it.each([
		["a slice resize", () => resize()],
		["a window resize", () => window.dispatchEvent(new Event("resize"))],
		["a scroll", () => window.dispatchEvent(new Event("scroll"))],
	])("moves the selected slice's highlight after %s", (_, shift) => {
		select("second")
		vi.mocked(second.getBoundingClientRect).mockReturnValue(new DOMRect(0, 250, 800, 300))
		act(shift)
		expect(highlights()).toEqual([{ sliceId: "second", top: "250px" }])
	})

	it("moves the selected slice's highlight after a DOM change", async () => {
		select("second")
		vi.mocked(second.getBoundingClientRect).mockReturnValue(new DOMRect(0, 450, 800, 300))
		await act(async () => {
			document.body.prepend(document.createElement("div"))
		})
		expect(highlights()).toEqual([{ sliceId: "second", top: "450px" }])
	})

	it("measures a scroll-to target only to scroll to it", () => {
		receive({ type: "prismic:embedded-preview:scroll-to-slice", sliceId: "second" })
		expect(second.getBoundingClientRect).toHaveBeenCalled()
		expect(window.scrollBy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: "instant" })
		clearMeasurements()

		act(() => {
			window.dispatchEvent(new Event("scroll"))
		})
		expect(second.getBoundingClientRect).not.toHaveBeenCalled()
		expect(highlights()).toEqual([])
	})
})
