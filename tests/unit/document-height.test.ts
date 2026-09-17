import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { startDocumentHeightReporting } from "../../src/toolbar/embedded-preview/document-height"

let resize: () => void
let height = 1000
let listeners: ReturnType<typeof vi.spyOn>

beforeEach(() => {
	vi.useFakeTimers()
	height = 1000
	vi.stubGlobal("innerWidth", 1000)
	vi.stubGlobal("innerHeight", 800)
	vi.stubGlobal(
		"ResizeObserver",
		class {
			constructor(callback: () => void) {
				resize = callback
			}
			observe() {}
		},
	)
	vi.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => height)
	vi.spyOn(document.body, "getBoundingClientRect").mockImplementation(() => ({ height }) as DOMRect)
	vi.spyOn(window, "getComputedStyle").mockReturnValue({
		marginTop: "0px",
		marginBottom: "0px",
	} as CSSStyleDeclaration)
	vi.spyOn(window.parent, "postMessage").mockImplementation(() => {})
	listeners = vi.spyOn(window, "addEventListener")
})
afterEach(() => {
	for (const [type, listener] of listeners.mock.calls)
		window.removeEventListener(type, listener as EventListener)
	vi.useRealTimers()
	vi.unstubAllGlobals()
})

describe("document height reporting", () => {
	it("rounds up body height with margins and does not repeat unchanged measurements", () => {
		height = 1000.25
		vi.mocked(window.getComputedStyle).mockReturnValue({
			marginTop: "4.5px",
			marginBottom: "8px",
		} as CSSStyleDeclaration)
		startDocumentHeightReporting({ parentOrigin: "http://localhost:5173" })
		resize()
		vi.runAllTimers()
		expect(window.parent.postMessage).toHaveBeenCalledExactlyOnceWith(
			{ type: "prismic:embedded-preview:document-height", height: 1013 },
			"http://localhost:5173",
		)
	})

	it("stops a repeated viewport-driven growth loop", () => {
		startDocumentHeightReporting({ parentOrigin: "http://localhost:5173" })
		for (let step = 1; step <= 3; step++) {
			vi.stubGlobal("innerHeight", 800 + step * 100)
			height += 100
			resize()
			vi.advanceTimersByTime(100)
		}
		expect(window.parent.postMessage).toHaveBeenLastCalledWith(
			{ type: "prismic:embedded-preview:document-height", height: null },
			"http://localhost:5173",
		)
		const count = vi.mocked(window.parent.postMessage).mock.calls.length
		height += 500
		resize()
		vi.runAllTimers()
		expect(window.parent.postMessage).toHaveBeenCalledTimes(count)
	})

	it("does not confuse width reflow with a viewport-height feedback loop", () => {
		startDocumentHeightReporting({ parentOrigin: "http://localhost:5173" })
		for (let step = 1; step <= 4; step++) {
			vi.stubGlobal("innerHeight", 800 + step * 100)
			vi.stubGlobal("innerWidth", 1000 - step * 100)
			height += 100
			resize()
			vi.advanceTimersByTime(100)
		}
		expect(window.parent.postMessage).toHaveBeenLastCalledWith(
			{ type: "prismic:embedded-preview:document-height", height: 1400 },
			"http://localhost:5173",
		)
	})
})
