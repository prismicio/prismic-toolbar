import { deepEqual } from "fast-equals"
import { useLayoutEffect, useState } from "preact/hooks"

import { isSetSlicesMessage } from "../message-protocol"
import type { SliceMetadata, SubscribeToMessages } from "../message-protocol"
import { findSliceMarkerRanges, measureSliceMarkerRange } from "./slice-overlay-geometry"
import type { Slice, SliceMarkerRange } from "./slice-overlay-geometry"

export function useSlices(subscribeToMessages: SubscribeToMessages) {
	const [slices, setSlices] = useState<Slice[]>([])

	useLayoutEffect(() => {
		// Only slices the editor describes belong to the edited document: others are left alone.
		let metadata = new Map<string, SliceMetadata>()
		let ranges: (SliceMarkerRange & SliceMetadata)[] = []
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
			ranges = findSliceMarkerRanges(document.body).flatMap((range) => {
				const slice = metadata.get(range.sliceId)
				return slice ? [{ ...range, ...slice }] : []
			})

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
		const unsubscribe = subscribeToMessages(({ data }) => {
			if (!isSetSlicesMessage(data)) return

			metadata = new Map(data.slices.map((slice) => [slice.sliceId, slice]))
			updateElements()
		})

		updateElements()

		// ResizeObserver does not detect scrolling or position-only movement.
		window.addEventListener("scroll", updateBounds, true)
		window.addEventListener("resize", updateBounds)
		document.addEventListener("pointermove", updateBounds, { passive: true })
		document.addEventListener("pointerover", updateBounds, { passive: true })
		return () => {
			unsubscribe()
			mutationObserver.disconnect()
			resizeObserver.disconnect()
			window.removeEventListener("scroll", updateBounds, true)
			window.removeEventListener("resize", updateBounds)
			document.removeEventListener("pointermove", updateBounds)
			document.removeEventListener("pointerover", updateBounds)
		}
	}, [subscribeToMessages])

	return slices
}
