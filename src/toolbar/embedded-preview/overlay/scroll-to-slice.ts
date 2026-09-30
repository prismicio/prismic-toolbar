import { measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { SliceMarkerRange, SliceRect } from "./slice-overlay-geometry"

export function scrollToSlice(slice: SliceMarkerRange, uiScale: number) {
	if (!measureSliceMarkerRange(slice)) return
	const inset = 16 * uiScale
	const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? "instant"
		: "smooth"
	let ancestor = slice.elements[0]?.parentElement
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
		const delta = getSliceScrollDelta(rect, top + inset, top + scroller.clientHeight)
		// Set inner containers first so the outer viewport measures their final bounds.
		if (delta) scroller.scrollBy({ top: delta, behavior: "instant" })
	}
	const rect = measureSliceMarkerRange(slice)
	if (!rect) return
	const delta = getSliceScrollDelta(rect, inset, window.innerHeight)
	if (delta) window.scrollBy({ top: delta, behavior })
}

// Reveal fitting slices with the smallest movement; align oversized slices at the top.
function getSliceScrollDelta(rect: SliceRect, visibleTop: number, visibleBottom: number) {
	const top = rect.top - window.scrollY
	if (top < visibleTop) return top - visibleTop
	if (rect.height > visibleBottom - visibleTop) {
		return top >= visibleBottom ? top - visibleTop : 0
	}
	return Math.max(0, top + rect.height - visibleBottom)
}
