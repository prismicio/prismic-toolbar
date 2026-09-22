import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { clamp, getPinDocumentPosition, getPinRectFromPosition } from "./comment-overlay-geometry"

beforeEach(() => {
	vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1000)
	vi.spyOn(document.documentElement, "scrollWidth", "get").mockReturnValue(1200)
	vi.spyOn(document.documentElement, "offsetWidth", "get").mockReturnValue(1000)
	vi.spyOn(document.body, "scrollWidth", "get").mockReturnValue(1200)
	vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(800)
	vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(1800)
	vi.spyOn(document.documentElement, "offsetHeight", "get").mockReturnValue(1800)
	vi.spyOn(document.body, "scrollHeight", "get").mockReturnValue(2000)
	vi.stubGlobal("innerWidth", 1000)
	vi.stubGlobal("innerHeight", 800)
	vi.stubGlobal("scrollX", 100)
	vi.stubGlobal("scrollY", 200)
})
afterEach(() => vi.unstubAllGlobals())

describe("overlay geometry", () => {
	it("anchors pins to content when the viewport is larger than the page", () => {
		vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(3200)
		vi.spyOn(document.documentElement, "scrollWidth", "get").mockReturnValue(3200)
		vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(3200)
		vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(3200)
		expect(getPinDocumentPosition({ xRatio: 0.5, yRatio: 0.5 }, 1)).toEqual({
			left: 600,
			top: 1000,
		})
	})
	it("uses document dimensions, including overflowing body content", () => {
		expect(getPinDocumentPosition({ xRatio: 0.5, yRatio: 0.5 }, 1)).toEqual({
			left: 600,
			top: 1000,
		})
	})
	it("keeps scaled pins inside document boundaries", () => {
		expect(getPinDocumentPosition({ xRatio: 0, yRatio: 0 }, 2)).toEqual({ left: 4, top: 4 })
		expect(getPinDocumentPosition({ xRatio: 1, yRatio: 1 }, 2)).toEqual({ left: 1132, top: 1932 })
	})
	it("reports viewport ratios after scrolling", () => {
		expect(getPinRectFromPosition({ xRatio: 0.5, yRatio: 0.5 }, 2)).toEqual({
			xRatio: 0.5,
			yRatio: 1,
			widthRatio: 0.064,
			heightRatio: 0.08,
		})
	})
	it("clamps coordinates without changing valid values", () => {
		expect([-0.5, 0, 0.5, 1, 2].map((value) => clamp(value))).toEqual([0, 0, 0.5, 1, 1])
	})
})
