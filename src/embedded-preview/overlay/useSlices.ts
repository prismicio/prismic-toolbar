import { useLayoutEffect, useState } from "preact/hooks"

import { isSetSlicesMessage } from "../message-protocol"
import type { SliceMetadata, SubscribeToMessages } from "../message-protocol"
import { findSliceMarkerRanges, measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { Slice, SliceRect } from "./slice-overlay-geometry"

/** Tracks the editor's slices. `layout` fires when they may have moved: see `useSliceRect`. */
export function useSlices(subscribeToMessages: SubscribeToMessages) {
	const [slices, setSlices] = useState<Slice[]>([])
	const [layout] = useState(() => new EventTarget())

	useLayoutEffect(() => {
		// Only slices the editor describes belong to the edited document: others are left alone.
		let metadata = new Map<string, SliceMetadata>()
		let observed = new Set<Element>()

		const notifyLayoutChange = () => layout.dispatchEvent(new Event("change"))
		// Any slice resizing can move the highlighted ones.
		const resizeObserver = new ResizeObserver(notifyLayoutChange)

		function updateElements() {
			const nextSlices = findSliceMarkerRanges(document.body).flatMap((range) => {
				const slice = metadata.get(range.sliceId)
				return slice ? [{ ...range, ...slice }] : []
			})
			setSlices((currentSlices) =>
				isSameSlices(currentSlices, nextSlices) ? currentSlices : nextSlices,
			)

			const next = new Set([
				document.body,
				document.documentElement,
				...nextSlices.flatMap((slice) => slice.elements),
			])

			for (const element of observed) {
				if (!next.has(element)) resizeObserver.unobserve(element)
			}

			for (const element of next) {
				if (!observed.has(element)) resizeObserver.observe(element, { box: "border-box" })
			}

			observed = next
		}

		const mutationObserver = new MutationObserver(() => {
			updateElements()
			notifyLayoutChange()
		})
		mutationObserver.observe(document.body, { childList: true, characterData: true, subtree: true })
		const unsubscribe = subscribeToMessages(({ data }) => {
			if (!isSetSlicesMessage(data)) return

			metadata = new Map(data.slices.map((slice) => [slice.sliceId, slice]))
			updateElements()
		})

		updateElements()

		// ResizeObserver does not detect scrolling or position-only movement.
		window.addEventListener("scroll", notifyLayoutChange, true)
		window.addEventListener("resize", notifyLayoutChange)
		document.addEventListener("pointermove", notifyLayoutChange, { passive: true })
		document.addEventListener("pointerover", notifyLayoutChange, { passive: true })
		return () => {
			unsubscribe()
			mutationObserver.disconnect()
			resizeObserver.disconnect()
			window.removeEventListener("scroll", notifyLayoutChange, true)
			window.removeEventListener("resize", notifyLayoutChange)
			document.removeEventListener("pointermove", notifyLayoutChange)
			document.removeEventListener("pointerover", notifyLayoutChange)
		}
	}, [subscribeToMessages, layout])

	return { slices, layout }
}

/** Measures a highlighted slice, again whenever `layout` fires. */
export function useSliceRect(slice: Slice, layout: EventTarget) {
	const [rect, setRect] = useState<SliceRect>()

	useLayoutEffect(() => {
		function updateRect() {
			const next = measureSliceMarkerRange(slice)
			setRect((rect) => (rect && next && isSameRect(rect, next) ? rect : next))
		}

		updateRect()
		layout.addEventListener("change", updateRect)
		return () => layout.removeEventListener("change", updateRect)
	}, [slice, layout])

	return rect
}

function isSameSlices(a: Slice[], b: Slice[]) {
	return (
		a.length === b.length &&
		a.every((slice, i) => {
			const other = b[i]!
			return (
				slice.sliceId === other.sliceId &&
				slice.zoneId === other.zoneId &&
				slice.index === other.index &&
				slice.label === other.label &&
				slice.variation === other.variation &&
				slice.canMoveUp === other.canMoveUp &&
				slice.canMoveDown === other.canMoveDown &&
				slice.elements.length === other.elements.length &&
				slice.elements.every((element, j) => element === other.elements[j])
			)
		})
	)
}

function isSameRect(a: SliceRect, b: SliceRect) {
	return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}
