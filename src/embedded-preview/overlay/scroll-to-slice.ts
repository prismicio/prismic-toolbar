import { measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { Slice, SliceRect } from "./slice-overlay-geometry"

export function scrollToSlice(slice: Slice, uiScale: number) {
	const firstElement = slice.elements[0]
	if (!firstElement) return

	let sliceRect = slice.rect
	if (!sliceRect) return

	const inset = 16 * uiScale

	// Stop a previous page scroll before revealing the slice in its containers.
	window.scrollTo({ top: window.scrollY, behavior: "instant" })

	// Reveal the slice in scrollable containers before scrolling the page.
	for (
		let ancestor = firstElement.parentElement;
		ancestor && ancestor !== document.documentElement;
		ancestor = ancestor.parentElement
	) {
		const overflow = getComputedStyle(ancestor).overflowY
		if (
			(overflow !== "auto" && overflow !== "scroll") ||
			ancestor.scrollHeight <= ancestor.clientHeight
		)
			continue

		const viewportTop = ancestor.getBoundingClientRect().top + ancestor.clientTop
		const scrollDelta = getSliceScrollDelta(
			sliceRect,
			viewportTop,
			viewportTop + ancestor.clientHeight,
			inset,
		)
		if (scrollDelta === 0) continue

		ancestor.scrollBy({ top: scrollDelta, behavior: "instant" })

		// Scrolling a container changes the bounds used for the next outer container or page.
		sliceRect = measureSliceMarkerRange(slice)
		if (!sliceRect) return
	}

	const windowDelta = getSliceScrollDelta(sliceRect, 0, window.innerHeight, inset)
	if (windowDelta === 0) return

	const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		? "instant"
		: "smooth"
	window.scrollBy({ top: windowDelta, behavior })
}

// Leave visible slices in place, centre clipped slices, and top-align tall slices.
function getSliceScrollDelta(
	sliceRect: SliceRect,
	viewportTop: number,
	viewportBottom: number,
	inset: number,
) {
	const sliceTop = sliceRect.top - window.scrollY
	const sliceBottom = sliceTop + sliceRect.height
	if (sliceTop >= viewportTop && sliceBottom <= viewportBottom) return 0

	if (sliceRect.height > viewportBottom - viewportTop) {
		return sliceTop - viewportTop - inset
	}

	const sliceCenter = sliceTop + sliceRect.height / 2
	const focusTop = Math.min(viewportTop + inset, viewportBottom - sliceRect.height)
	const viewportCenter = (focusTop + viewportBottom) / 2
	return sliceCenter - viewportCenter
}
