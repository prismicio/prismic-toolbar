import { measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { SliceMarkerRange } from "./slice-overlay-geometry"

// Returns the smallest movement that reveals a fitting slice. For oversized
// slices the top is the anchor, leaving space for the outline.
export function getSliceScrollDelta(
	top: number,
	bottom: number,
	visibleTop: number,
	visibleBottom: number,
) {
	if (top < visibleTop) return top - visibleTop
	if (bottom - top > visibleBottom - visibleTop) {
		return top >= visibleBottom ? top - visibleTop : 0
	}
	return Math.max(0, bottom - visibleBottom)
}

export function scrollToSlice(slice: SliceMarkerRange, uiScale: number) {
	if (!measureSliceMarkerRange(slice)) return
	const inset = 16 * uiScale
	const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? "instant"
		: "smooth"
	let ancestor = slice.elements[0]?.parentElement
	// Multi-root slices must be revealed as a whole, not just their first root.
	while (ancestor && !slice.elements.every((element) => ancestor?.contains(element))) {
		ancestor = ancestor.parentElement
	}
	const scrollers: HTMLElement[] = []
	while (ancestor && ancestor !== document.documentElement) {
		const overflow = getComputedStyle(ancestor).overflowY
		if (/(auto|scroll)/.test(overflow) && ancestor.scrollHeight > ancestor.clientHeight)
			scrollers.push(ancestor)
		ancestor = ancestor.parentElement
	}
	// Cancel previous smooth scrolling before measuring the next activation.
	for (const scroller of scrollers)
		scroller.scrollTo({ top: scroller.scrollTop, behavior: "instant" })
	window.scrollTo({ top: window.scrollY, behavior: "instant" })
	for (const scroller of scrollers) {
		const rect = measureSliceMarkerRange(slice)
		if (!rect) return
		const viewport = scroller.getBoundingClientRect()
		const top = viewport.top + scroller.clientTop
		const delta = getSliceScrollDelta(
			rect.top - window.scrollY,
			rect.top + rect.height - window.scrollY,
			top + inset,
			top + scroller.clientHeight,
		)
		// Set inner containers first so the outer viewport measures their final bounds.
		if (delta) scroller.scrollBy({ top: delta, behavior: "instant" })
	}
	const rect = measureSliceMarkerRange(slice)
	if (!rect) return
	const delta = getSliceScrollDelta(
		rect.top - window.scrollY,
		rect.top + rect.height - window.scrollY,
		inset,
		window.innerHeight,
	)
	if (delta) window.scrollBy({ top: delta, behavior })
}
