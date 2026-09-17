import { afterEach, describe, expect, it, vi } from "vitest"

import {
	createSliceMarkerRangeLookup,
	findSliceMarkerRangeAtElement,
	findSliceMarkerRanges,
	measureSliceMarkerRange,
} from "../../src/toolbar/embedded-preview/slice-overlay"

afterEach(() => {
	document.body.replaceChildren()
	vi.unstubAllGlobals()
})

describe("slice overlay", () => {
	it("finds marked slice elements and prefers the innermost slice", () => {
		document.body.innerHTML = `
			<!--prismic-slice-start:outer-->
			<section id="outer">
				<div id="outer-content"></div>
				<!--prismic-slice-start:inner-->
				<div id="inner"></div>
				<!--prismic-slice-end:inner-->
			</section>
			<!--prismic-slice-end:outer-->
		`

		const ranges = findSliceMarkerRanges(document.body)
		const outer = document.querySelector("#outer")
		const outerContent = document.querySelector("#outer-content")
		const inner = document.querySelector("#inner")
		const lookup = createSliceMarkerRangeLookup(ranges)

		expect(ranges.map((range) => range.sliceId)).toEqual(["inner", "outer"])
		expect(inner && findSliceMarkerRangeAtElement(lookup, inner)?.sliceId).toBe("inner")
		expect(outer && findSliceMarkerRangeAtElement(lookup, outer)?.sliceId).toBe("outer")
		expect(outerContent && findSliceMarkerRangeAtElement(lookup, outerContent)?.sliceId).toBe(
			"outer",
		)
	})

	it("measures one rectangle around multiple slice elements", () => {
		document.body.innerHTML = `
			<!--prismic-slice-start:slice-id-->
			<div id="first"></div>
			<div id="second"></div>
			<!--prismic-slice-end:slice-id-->
		`

		const first = document.querySelector("#first")
		const second = document.querySelector("#second")
		if (!first || !second) throw new Error("Missing slice fixture elements")

		vi.spyOn(first, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 10, 100, 40))
		vi.spyOn(second, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 80, 160, 20))
		vi.stubGlobal("scrollX", 5)
		vi.stubGlobal("scrollY", 30)

		const [range] = findSliceMarkerRanges(document.body)
		expect(range && measureSliceMarkerRange(range)).toEqual({
			top: 40,
			left: 15,
			width: 160,
			height: 90,
		})
	})
})
