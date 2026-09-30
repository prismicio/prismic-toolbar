import { describe, expect, it } from "vitest"

import { getSliceScrollDelta } from "./scroll-to-slice"

describe("revealing slices", () => {
	it.each([
		[100, 400, 0],
		[-100, 400, -116],
		[500, 800, 100],
		[900, 1100, 400],
		[100, 1200, 0],
		[-100, 1200, -116],
		[900, 2000, 884],
	])("slice %i..%i needs delta %i", (top, bottom, delta) => {
		expect(getSliceScrollDelta(top, bottom, 16, 700)).toBe(delta)
	})
})
