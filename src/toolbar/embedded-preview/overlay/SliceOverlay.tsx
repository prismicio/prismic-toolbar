import { useLayoutEffect, useState } from "preact/hooks"

import { createSelectSliceMessage } from "../message-protocol"
import type { PostMessage } from "../message-protocol"
import {
	createSliceMarkerRangeLookup,
	findSliceMarkerRangeAtElement,
	findSliceMarkerRanges,
	measureSliceMarkerRange,
} from "./slice-overlay-geometry"
import type { SliceMarkerRange, SliceRect } from "./slice-overlay-geometry"

interface SliceOverlayProps {
	postMessage: PostMessage
}

interface SliceHighlightState {
	sliceId: string
	rect: SliceRect
}

export function SliceOverlay({ postMessage }: SliceOverlayProps) {
	const highlight = useSliceHighlight(postMessage)
	return highlight ? <SliceHighlight {...highlight} /> : null
}

function SliceHighlight({ sliceId, rect }: SliceHighlightState) {
	return (
		<div
			className="slice-highlight"
			data-slice-id={sliceId}
			style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
		>
			<span className="slice-highlight-badge">{sliceId}</span>
		</div>
	)
}

function useSliceHighlight(postMessage: PostMessage) {
	const [highlight, setHighlight] = useState<SliceHighlightState>()

	useLayoutEffect(() => {
		let lookup: WeakMap<Element, SliceMarkerRange> | undefined
		let pointer: { x: number; y: number } | undefined
		let animationFrame: number | undefined

		const mutationObserver = new MutationObserver((records) => {
			if (
				records.some(
					({ type, target }) => type === "childList" || target.nodeType === Node.COMMENT_NODE,
				)
			) {
				lookup = undefined
			}
		})
		mutationObserver.observe(document.body, {
			childList: true,
			characterData: true,
			subtree: true,
		})

		function findRange(target: Element | null) {
			if (!target) return
			lookup ??= createSliceMarkerRangeLookup(findSliceMarkerRanges(document.body))
			return findSliceMarkerRangeAtElement(lookup, target)
		}

		function updateHighlight() {
			if (!pointer) return
			const range = findRange(document.elementFromPoint(pointer.x, pointer.y))
			const rect = range && measureSliceMarkerRange(range)
			const next = range && rect ? { sliceId: range.sliceId, rect } : undefined
			setHighlight((current) => (areHighlightsEqual(current, next) ? current : next))
			// Position can change without a resize or DOM mutation (e.g. CSS transforms).
			animationFrame = requestAnimationFrame(updateHighlight)
		}

		function trackPointer(event: PointerEvent) {
			pointer = { x: event.clientX, y: event.clientY }
			if (animationFrame === undefined) animationFrame = requestAnimationFrame(updateHighlight)
		}

		function stopTracking() {
			if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
			animationFrame = undefined
			pointer = undefined
			setHighlight(undefined)
		}

		function selectSlice(event: MouseEvent) {
			const range = findRange(event.target instanceof Element ? event.target : null)
			if (!range) return
			event.preventDefault()
			event.stopPropagation()
			postMessage(createSelectSliceMessage(range.sliceId))
		}

		document.addEventListener("pointermove", trackPointer, { passive: true })
		document.addEventListener("pointerover", trackPointer, { passive: true })
		document.addEventListener("click", selectSlice)
		document.documentElement.addEventListener("pointerleave", stopTracking)
		window.addEventListener("blur", stopTracking)

		return () => {
			stopTracking()
			mutationObserver.disconnect()
			document.removeEventListener("pointermove", trackPointer)
			document.removeEventListener("pointerover", trackPointer)
			document.removeEventListener("click", selectSlice)
			document.documentElement.removeEventListener("pointerleave", stopTracking)
			window.removeEventListener("blur", stopTracking)
		}
	}, [postMessage])

	return highlight
}

function areHighlightsEqual(
	first: SliceHighlightState | undefined,
	second: SliceHighlightState | undefined,
) {
	return (
		first?.sliceId === second?.sliceId &&
		first?.rect.top === second?.rect.top &&
		first?.rect.left === second?.rect.left &&
		first?.rect.width === second?.rect.width &&
		first?.rect.height === second?.rect.height
	)
}
