import { h, render } from "preact"
import { useLayoutEffect } from "preact/hooks"
import { act } from "preact/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Slice } from "./slice-overlay-geometry"
import { useSlices } from "./useSlices"

let slices: Slice[]
let publications = 0
let root: ShadowRoot
let element: HTMLElement
let resize: () => void
const observe = vi.fn()
const unobserve = vi.fn()
const disconnect = vi.fn()

function Harness() {
	const currentSlices = useSlices()
	useLayoutEffect(() => {
		slices = currentSlices
		publications += 1
	}, [currentSlices])
	return null
}

beforeEach(() => {
	document.body.innerHTML = `
		<!--prismic-slice-start:slice-->
		<section id="slice"></section>
		<!--prismic-slice-end:slice-->
	`
	element = document.querySelector("#slice")!
	vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 200, 100))
	const host = document.createElement("div")
	root = host.attachShadow({ mode: "open" })
	document.body.append(host)
	observe.mockClear()
	unobserve.mockClear()
	disconnect.mockClear()
	vi.stubGlobal(
		"ResizeObserver",
		class {
			constructor(callback: () => void) {
				resize = callback
			}
			observe = observe
			unobserve = unobserve
			disconnect = disconnect
		},
	)
	act(() => render(h(Harness, {}), root))
	publications = 0
})

afterEach(() => {
	act(() => render(null, root))
	document.body.replaceChildren()
	vi.unstubAllGlobals()
})

describe("shared slice model", () => {
	it("does not publish unchanged slices", () => {
		act(() => {
			document.dispatchEvent(new Event("pointermove"))
		})
		expect(publications).toBe(0)
	})

	it("refreshes bounds after unrelated DOM changes without restarting resize observation", async () => {
		observe.mockClear()
		vi.mocked(element.getBoundingClientRect).mockReturnValue(new DOMRect(10, 50, 200, 100))
		await act(async () => {
			document.body.prepend(document.createElement("div"))
		})
		expect(slices[0]?.rect?.top).toBe(50)
		expect(observe).not.toHaveBeenCalled()
		expect(unobserve).not.toHaveBeenCalled()
		expect(disconnect).not.toHaveBeenCalled()
	})

	it("publishes replaced roots, changed marker IDs, and removed slices", async () => {
		const replacement = document.createElement("section")
		vi.spyOn(replacement, "getBoundingClientRect").mockReturnValue(new DOMRect(30, 40, 250, 150))
		await act(async () => {
			element.replaceWith(replacement)
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
			while (walker.nextNode()) {
				const marker = walker.currentNode as Comment
				marker.data = marker.data.replace(":slice", ":renamed")
			}
		})
		expect(slices).toEqual([
			{
				sliceId: "renamed",
				elements: [replacement],
				rect: { top: 40, left: 30, width: 250, height: 150 },
			},
		])
		expect(unobserve).toHaveBeenCalledWith(element)
		expect(observe).toHaveBeenCalledWith(replacement, { box: "border-box" })
		await act(async () => replacement.remove())
		expect(slices[0]?.rect).toBeUndefined()
		expect(unobserve).toHaveBeenCalledWith(replacement)
	})

	it.each(["element resize", "resize", "scroll", "pointermove"])(
		"updates bounds on %s",
		(event) => {
			vi.mocked(element.getBoundingClientRect).mockReturnValue(new DOMRect(10, 5, 200, 120))
			act(() => {
				if (event === "element resize") resize()
				else if (event === "pointermove") document.dispatchEvent(new Event(event))
				else window.dispatchEvent(new Event(event))
			})
			expect(slices[0]?.rect).toEqual({ top: 5, left: 10, width: 200, height: 120 })
		},
	)

	it("disconnects observers and event listeners on unmount", async () => {
		const mutationDisconnect = vi.spyOn(MutationObserver.prototype, "disconnect")
		act(() => render(null, root))
		expect(mutationDisconnect).toHaveBeenCalledOnce()
		expect(disconnect).toHaveBeenCalledOnce()
		vi.mocked(element.getBoundingClientRect).mockClear()
		await act(async () => {
			window.dispatchEvent(new Event("scroll"))
			window.dispatchEvent(new Event("resize"))
			document.dispatchEvent(new Event("pointermove"))
			document.dispatchEvent(new Event("pointerover"))
			document.body.append(document.createElement("div"))
		})
		expect(element.getBoundingClientRect).not.toHaveBeenCalled()
	})
})
