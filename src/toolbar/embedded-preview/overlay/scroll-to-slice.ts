import { measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { SliceMarkerRange, SliceRect } from "./slice-overlay-geometry"

export function scrollToSlice(slice: SliceMarkerRange, uiScale: number) {
	const firstElement = slice.elements[0]
	let rect = measureSliceMarkerRange(slice)
	if (!firstElement || !rect) return

	const inset = 16 * uiScale
	window.scrollTo({ top: window.scrollY, behavior: "instant" })

	// Native scrollIntoView cannot align the combined bounds of multiple slice roots.
	// Reveal inner containers first, then measure the range in its new position.
	for (let ancestor = firstElement.parentElement; ancestor; ancestor = ancestor.parentElement) {
		if (ancestor === document.documentElement) break
		const overflow = getComputedStyle(ancestor).overflowY
		if (overflow !== "auto" && overflow !== "scroll") continue
		if (ancestor.scrollHeight <= ancestor.clientHeight) continue

		const top = ancestor.getBoundingClientRect().top + ancestor.clientTop
		const delta = getScrollDelta(rect, top, top + ancestor.clientHeight, inset)
		if (delta === 0) continue

		ancestor.scrollBy({ top: delta, behavior: "instant" })
		rect = measureSliceMarkerRange(slice)
		if (!rect) return
	}

	const delta = getScrollDelta(rect, 0, window.innerHeight, inset)
	if (delta === 0) return
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
	window.scrollBy({ top: delta, behavior: reducedMotion ? "instant" : "smooth" })
}

function getScrollDelta(rect: SliceRect, viewportTop: number, viewportBottom: number, inset: number) {
	const top = rect.top - window.scrollY
	const bottom = top + rect.height
	if (top >= viewportTop && bottom <= viewportBottom) return 0
	if (rect.height > viewportBottom - viewportTop) return top - viewportTop - inset
	return (top + bottom - viewportTop - viewportBottom) / 2
}
