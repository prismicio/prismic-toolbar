import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks"

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

export function SliceOverlay(props: SliceOverlayProps) {
	const { postMessage } = props

	const ranges = useSliceMarkerRanges()
	const hoveredRange = useHoveredSliceMarkerRange({ ranges, postMessage })

	return hoveredRange ? <SliceHighlight range={hoveredRange} /> : null
}

interface SliceHighlightProps {
	range: SliceMarkerRange
}

function SliceHighlight(props: SliceHighlightProps) {
	const { range } = props

	const [rect, setRect] = useState<SliceRect>()

	const updateRect = useCallback(() => {
		const nextRect = measureSliceMarkerRange(range)
		setRect((currentRect) => (areRectsEqual(currentRect, nextRect) ? currentRect : nextRect))
	}, [range])

	useLayoutEffect(updateRect, [updateRect])

	useEffect(() => {
		const resizeObserver = new ResizeObserver(updateRect)
		for (const element of range.elements) resizeObserver.observe(element)
		resizeObserver.observe(document.documentElement)
		resizeObserver.observe(document.body)
		window.addEventListener("resize", updateRect)

		return () => {
			resizeObserver.disconnect()
			window.removeEventListener("resize", updateRect)
		}
	}, [range, updateRect])

	if (!rect) return null

	return (
		<div
			className="slice-highlight"
			data-slice-id={range.sliceId}
			style={`top: ${rect.top}px; left: ${rect.left}px; width: ${rect.width}px; height: ${rect.height}px`}
		>
			<span className="slice-highlight-badge">{range.sliceId}</span>
		</div>
	)
}

function useSliceMarkerRanges() {
	const [ranges, setRanges] = useState<SliceMarkerRange[]>([])

	useLayoutEffect(() => {
		const updateRanges = () => setRanges(findSliceMarkerRanges(document.body))
		const mutationObserver = new MutationObserver(updateRanges)

		updateRanges()
		mutationObserver.observe(document.body, { childList: true, subtree: true })

		return () => mutationObserver.disconnect()
	}, [])

	return ranges
}

interface UseHoveredSliceMarkerRangeArgs {
	ranges: SliceMarkerRange[]
	postMessage: PostMessage
}

function useHoveredSliceMarkerRange(args: UseHoveredSliceMarkerRangeArgs) {
	const { ranges, postMessage } = args

	const pointerRef = useRef<{ x: number; y: number }>()
	const [hoveredRange, setHoveredRange] = useState<SliceMarkerRange>()
	const rangeLookup = useMemo(() => createSliceMarkerRangeLookup(ranges), [ranges])

	const setHoveredRangeAtElement = useCallback(
		(target: Element | null) => {
			const nextRange = target ? findSliceMarkerRangeAtElement(rangeLookup, target) : undefined
			setHoveredRange(nextRange)
		},
		[rangeLookup],
	)

	const updateHoveredRange = useCallback(() => {
		const pointer = pointerRef.current
		const target = pointer ? document.elementFromPoint(pointer.x, pointer.y) : null
		setHoveredRangeAtElement(target)
	}, [setHoveredRangeAtElement])

	useLayoutEffect(updateHoveredRange, [updateHoveredRange])

	useEffect(() => {
		const handlePointerMove = (event: PointerEvent) => {
			pointerRef.current = { x: event.clientX, y: event.clientY }
		}

		const handlePointerOver = (event: PointerEvent) => {
			pointerRef.current = { x: event.clientX, y: event.clientY }
			setHoveredRangeAtElement(event.target instanceof Element ? event.target : null)
		}

		const handleClick = (event: MouseEvent) => {
			const target = event.target instanceof Element ? event.target : null
			const range = target ? findSliceMarkerRangeAtElement(rangeLookup, target) : undefined
			if (!range) return

			event.preventDefault()
			event.stopPropagation()
			postMessage(createSelectSliceMessage(range.sliceId))
		}

		const clearHoveredRange = () => {
			pointerRef.current = undefined
			setHoveredRange(undefined)
		}

		document.addEventListener("pointermove", handlePointerMove, { passive: true })
		document.addEventListener("pointerover", handlePointerOver, { passive: true })
		document.addEventListener("click", handleClick)
		document.documentElement.addEventListener("pointerleave", clearHoveredRange)
		window.addEventListener("blur", clearHoveredRange)
		window.addEventListener("scroll", updateHoveredRange, true)
		window.addEventListener("resize", updateHoveredRange)

		return () => {
			document.removeEventListener("pointermove", handlePointerMove)
			document.removeEventListener("pointerover", handlePointerOver)
			document.removeEventListener("click", handleClick)
			document.documentElement.removeEventListener("pointerleave", clearHoveredRange)
			window.removeEventListener("blur", clearHoveredRange)
			window.removeEventListener("scroll", updateHoveredRange, true)
			window.removeEventListener("resize", updateHoveredRange)
		}
	}, [postMessage, rangeLookup, setHoveredRangeAtElement, updateHoveredRange])

	return hoveredRange
}

function areRectsEqual(first: SliceRect | undefined, second: SliceRect | undefined) {
	return (
		first?.top === second?.top &&
		first?.left === second?.left &&
		first?.width === second?.width &&
		first?.height === second?.height
	)
}
