import { deepEqual } from "fast-equals"
import { useLayoutEffect, useState } from "preact/hooks"

import { findSliceMarkerRanges, measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { Slice, SliceMarkerRange } from "./slice-overlay-geometry"

export function useSlices() {
	const [slices, setSlices] = useState<Slice[]>([])

	useLayoutEffect(() => {
		let ranges: SliceMarkerRange[] = []
		let observed = new Set<Element>()

		function updateBounds() {
			const nextSlices = ranges.map((range) => ({
				...range,
				rect: measureSliceMarkerRange(range),
			}))
			setSlices((currentSlices) =>
				deepEqual(currentSlices, nextSlices) ? currentSlices : nextSlices,
			)
		}

		const resizeObserver = new ResizeObserver(updateBounds)

		function updateElements() {
			ranges = findSliceMarkerRanges(document.body)

			const next = new Set([
				document.body,
				document.documentElement,
				...ranges.flatMap((slice) => slice.elements),
			])

			for (const element of observed) {
				if (!next.has(element)) resizeObserver.unobserve(element)
			}

			for (const element of next) {
				if (!observed.has(element)) resizeObserver.observe(element, { box: "border-box" })
			}

			observed = next
			updateBounds()
		}

		const mutationObserver = new MutationObserver(updateElements)
		mutationObserver.observe(document.body, { childList: true, characterData: true, subtree: true })

		updateElements()

		// ResizeObserver does not detect scrolling or position-only movement.
		window.addEventListener("scroll", updateBounds, true)
		window.addEventListener("resize", updateBounds)
		document.addEventListener("pointermove", updateBounds, { passive: true })
		document.addEventListener("pointerover", updateBounds, { passive: true })
		return () => {
			mutationObserver.disconnect()
			resizeObserver.disconnect()
			window.removeEventListener("scroll", updateBounds, true)
			window.removeEventListener("resize", updateBounds)
			document.removeEventListener("pointermove", updateBounds)
			document.removeEventListener("pointerover", updateBounds)
		}
	}, [])

	return slices
}
