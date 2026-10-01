import { measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { SliceMarkerRange, SliceRect } from "./slice-overlay-geometry"

export function scrollToSlice(slice: SliceMarkerRange, uiScale: number) {
	const firstElement = slice.elements[0]
	if (!firstElement) return

	let sliceRect = measureSliceMarkerRange(slice)
	if (!sliceRect) return

	const inset = 16 * uiScale

	// Stop a previous smooth scroll before calculating viewport offsets.
	window.scrollTo({ top: window.scrollY, behavior: "instant" })

	// Reveal the slice in scrollable containers before scrolling the page.
	let ancestor = firstElement.parentElement
	while (ancestor && ancestor !== document.documentElement) {
		const overflow = getComputedStyle(ancestor).overflowY
		if (
			(overflow === "auto" || overflow === "scroll") &&
			ancestor.scrollHeight > ancestor.clientHeight
		) {
			const viewportTop = ancestor.getBoundingClientRect().top + ancestor.clientTop
			const scrollDelta = getSliceScrollDelta(
				sliceRect,
				viewportTop + inset,
				viewportTop + ancestor.clientHeight,
			)

			if (scrollDelta !== 0) {
				ancestor.scrollBy({ top: scrollDelta, behavior: "instant" })
				sliceRect = measureSliceMarkerRange(slice)
				if (!sliceRect) return
			}
		}

		ancestor = ancestor.parentElement
	}

	const windowDelta = getSliceScrollDelta(sliceRect, inset, window.innerHeight)
	if (windowDelta === 0) return

	const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? "instant"
		: "smooth"
	window.scrollBy({ top: windowDelta, behavior })
}

// Fully reveal fitting slices; leave tall slices in place if their start is visible.
function getSliceScrollDelta(sliceRect: SliceRect, viewportTop: number, viewportBottom: number) {
	const sliceTop = sliceRect.top - window.scrollY
	const sliceBottom = sliceTop + sliceRect.height

	if (sliceTop < viewportTop) return sliceTop - viewportTop
	if (sliceBottom <= viewportBottom) return 0
	if (sliceRect.height <= viewportBottom - viewportTop) return sliceBottom - viewportBottom

	return sliceTop >= viewportBottom ? sliceTop - viewportTop : 0
}
