import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks"

import {
	createSliceMarkerRangeLookup,
	findSliceMarkerRangeAtElement,
	findSliceMarkerRanges,
	measureSliceMarkerRange,
} from "../slice-overlay"
import type { SliceMarkerRange, SliceRect } from "../slice-overlay"

export function SliceOverlay() {
	const ranges = useSliceMarkerRanges()
	const hoveredRange = useHoveredSliceMarkerRange(ranges)

	return (
		<div className="slice-overlay">{hoveredRange && <SliceHighlight range={hoveredRange} />}</div>
	)
}

function SliceHighlight({ range }: { range: SliceMarkerRange }) {
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

function useHoveredSliceMarkerRange(ranges: SliceMarkerRange[]) {
	const pointerRef = useRef<{ x: number; y: number }>()
	const [hoveredRange, setHoveredRange] = useState<SliceMarkerRange>()
	const rangeLookup = useMemo(() => createSliceMarkerRangeLookup(ranges), [ranges])

	const setHoveredRangeAtElement = useCallback(
		(target: Element | null) => {
			const nextRange = target ? findSliceMarkerRangeAtElement(rangeLookup, target) : undefined
			setHoveredRange((currentRange) => (currentRange === nextRange ? currentRange : nextRange))
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
		let animationFrame: number | undefined

		const handlePointerMove = (event: PointerEvent) => {
			pointerRef.current = { x: event.clientX, y: event.clientY }
		}
		const handlePointerOver = (event: PointerEvent) => {
			pointerRef.current = { x: event.clientX, y: event.clientY }
			setHoveredRangeAtElement(event.target instanceof Element ? event.target : null)
		}
		const updateHoveredRangeSoon = () => {
			if (animationFrame !== undefined) return
			animationFrame = requestAnimationFrame(() => {
				animationFrame = undefined
				updateHoveredRange()
			})
		}
		const clearHoveredRange = () => {
			pointerRef.current = undefined
			setHoveredRange(undefined)
		}

		document.addEventListener("pointermove", handlePointerMove, { passive: true })
		document.addEventListener("pointerover", handlePointerOver, { passive: true })
		document.documentElement.addEventListener("pointerleave", clearHoveredRange)
		window.addEventListener("blur", clearHoveredRange)
		window.addEventListener("scroll", updateHoveredRangeSoon, true)
		window.addEventListener("resize", updateHoveredRangeSoon)

		return () => {
			if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
			document.removeEventListener("pointermove", handlePointerMove)
			document.removeEventListener("pointerover", handlePointerOver)
			document.documentElement.removeEventListener("pointerleave", clearHoveredRange)
			window.removeEventListener("blur", clearHoveredRange)
			window.removeEventListener("scroll", updateHoveredRangeSoon, true)
			window.removeEventListener("resize", updateHoveredRangeSoon)
		}
	}, [setHoveredRangeAtElement, updateHoveredRange])

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
