import { useCallback, useLayoutEffect, useState } from "preact/hooks"

import { isSetSlicesMessage } from "../message-protocol"
import type { SliceMetadata, SubscribeToMessages } from "../message-protocol"
import { findSliceMarkerRanges, measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { Slice, SliceRect } from "./slice-overlay-geometry"

export type SubscribeToLayoutChanges = (listener: () => void) => () => void

/**
 * Tracks the slices the editor describes and signals when their layout may have changed. Slices are
 * not measured here: only highlighted slices are, with `useSliceRect`.
 */
export function useSlices(subscribeToMessages: SubscribeToMessages) {
	const [slices, setSlices] = useState<Slice[]>([])
	const [layoutListeners] = useState(() => new Set<() => void>())

	const subscribeToLayoutChanges = useCallback<SubscribeToLayoutChanges>(
		(listener) => {
			layoutListeners.add(listener)
			return () => layoutListeners.delete(listener)
		},
		[layoutListeners],
	)

	useLayoutEffect(() => {
		// Only slices the editor describes belong to the edited document: others are left alone.
		let metadata = new Map<string, SliceMetadata>()
		let observed = new Set<Element>()

		function notifyLayoutChange() {
			for (const listener of layoutListeners) listener()
		}

		// Observing every slice root is cheap: callbacks only fire when one resizes, which can move
		// the highlighted slices.
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
	}, [subscribeToMessages, layoutListeners])

	return { slices, subscribeToLayoutChanges }
}

/** Measures a slice in document coordinates, again whenever its layout may have changed. */
export function useSliceRect(slice: Slice, subscribeToLayoutChanges: SubscribeToLayoutChanges) {
	const [rect, setRect] = useState<SliceRect>()

	useLayoutEffect(() => {
		function updateRect() {
			const nextRect = measureSliceMarkerRange(slice)
			setRect((currentRect) => (isSameRect(currentRect, nextRect) ? currentRect : nextRect))
		}

		updateRect()
		return subscribeToLayoutChanges(updateRect)
	}, [slice, subscribeToLayoutChanges])

	return rect
}

function isSameSlices(a: Slice[], b: Slice[]) {
	return (
		a.length === b.length &&
		a.every((slice, index) => {
			const other = b[index]
			return (
				other !== undefined &&
				slice.sliceId === other.sliceId &&
				slice.label === other.label &&
				slice.variation === other.variation &&
				slice.elements.length === other.elements.length &&
				slice.elements.every((element, index) => element === other.elements[index])
			)
		})
	)
}

function isSameRect(a: SliceRect | undefined, b: SliceRect | undefined) {
	return (
		a === b ||
		(a !== undefined &&
			b !== undefined &&
			a.top === b.top &&
			a.left === b.left &&
			a.width === b.width &&
			a.height === b.height)
	)
}
