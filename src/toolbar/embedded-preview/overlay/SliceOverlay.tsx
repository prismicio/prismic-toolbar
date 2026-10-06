import { useStableCallback } from "@toolbar/support/react"
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks"

import {
	createSelectSliceMessage,
	isScrollToPinMessage,
	isSliceOverlayMessage,
	isScrollToSliceMessage,
} from "../message-protocol"
import type { PostMessage, SubscribeToMessages, SetSliceOverlayMessage } from "../message-protocol"
import { scrollToSlice } from "./scroll-to-slice"
import { findSliceAtElement } from "./slice-overlay-geometry"
import type { Slice } from "./slice-overlay-geometry"

interface SliceOverlayProps {
	postMessage: PostMessage
	subscribeToMessages: SubscribeToMessages
	uiScale: number
	slices: Slice[]
}

export function SliceOverlay(props: SliceOverlayProps) {
	const { postMessage, slices, subscribeToMessages, uiScale } = props
	const [overlay, setOverlay] = useState<SetSliceOverlayMessage>()
	const { revealSlice, cancelReveal } = useSliceScroll(slices, uiScale)

	const handleMessage = useStableCallback(({ data }: MessageEvent<unknown>) => {
		if (isSliceOverlayMessage(data)) {
			setOverlay(data)
			return
		}

		if (isScrollToSliceMessage(data)) revealSlice(data.sliceId)
		if (isScrollToPinMessage(data)) cancelReveal()
	})

	useLayoutEffect(() => subscribeToMessages(handleMessage), [subscribeToMessages, handleMessage])

	const eligibleSlices = useMemo(
		() => (overlay ? slices.filter((slice) => overlay.sliceIds.includes(slice.sliceId)) : slices),
		[slices, overlay],
	)
	const hoveredSlice = useHoveredSlice(eligibleSlices)
	const selectedSlice = eligibleSlices.find((slice) => slice.sliceId === overlay?.selectedSliceId)

	useSliceSelection(eligibleSlices, (slice) => {
		revealSlice(slice.sliceId)
		postMessage(createSelectSliceMessage(slice.sliceId))
	})

	return (
		<>
			{selectedSlice && <SliceHighlight slice={selectedSlice} />}
			{hoveredSlice && hoveredSlice !== selectedSlice && <SliceHighlight slice={hoveredSlice} />}
		</>
	)
}

function useSliceScroll(slices: Slice[], uiScale: number) {
	const pendingSliceIdRef = useRef<string>()
	const timeoutRef = useRef<number>()
	const cancelReveal = useStableCallback(() => {
		window.clearTimeout(timeoutRef.current)
		pendingSliceIdRef.current = undefined
	})

	const reveal = useStableCallback(() => {
		const slice = slices.find((slice) => slice.sliceId === pendingSliceIdRef.current)
		pendingSliceIdRef.current = undefined
		if (slice) scrollToSlice(slice, uiScale)
	})

	// Opening an editor panel animates the preview size. Reveal once that size settles.
	const schedule = useStableCallback(() => {
		if (!pendingSliceIdRef.current) return

		window.clearTimeout(timeoutRef.current)
		timeoutRef.current = window.setTimeout(reveal, 100)
	})

	useLayoutEffect(schedule, [schedule, uiScale])

	useLayoutEffect(() => {
		const controller = new AbortController()
		window.addEventListener("resize", schedule, { signal: controller.signal })
		for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
			window.addEventListener(event, cancelReveal, { capture: true, signal: controller.signal })
		}

		return () => {
			cancelReveal()
			controller.abort()
		}
	}, [schedule, cancelReveal])

	const revealSlice = useStableCallback((sliceId: string) => {
		pendingSliceIdRef.current = sliceId
		schedule()
	})

	return { revealSlice, cancelReveal }
}

function useHoveredSlice(slices: Slice[]) {
	const [target, setTarget] = useState<Element | null>(null)

	// Slice highlights remain pointer-transparent so they do not block the preview. Hover and slice
	// selection therefore use document events. Interactive controls added to a highlight should use
	// `pointer-events: auto` and regular `onClick` handlers because they intentionally cover the page.
	useLayoutEffect(() => {
		function track(event: PointerEvent) {
			const hoverTarget = event.target instanceof Element ? event.target : null
			setTarget(hoverTarget)
		}

		function clear() {
			setTarget(null)
		}

		document.addEventListener("pointermove", track, { passive: true })
		document.addEventListener("pointerover", track, { passive: true })
		document.documentElement.addEventListener("pointerleave", clear)
		window.addEventListener("blur", clear)

		return () => {
			document.removeEventListener("pointermove", track)
			document.removeEventListener("pointerover", track)
			document.documentElement.removeEventListener("pointerleave", clear)
			window.removeEventListener("blur", clear)
		}
	}, [])

	const slice = useMemo(() => findSliceAtElement(slices, target), [slices, target])

	return slice
}

const interactiveElementSelector = [
	"a[href]",
	"button",
	"input",
	"select",
	"textarea",
	"label",
	"summary",
	'[role="button"]',
	'[role="link"]',
].join(",")

function useSliceSelection(slices: Slice[], onSelect: (slice: Slice) => void) {
	const selectSlice = useStableCallback((event: MouseEvent) => {
		// Don't select a slice if the user is interacting with the UI or has selected text.
		if (event.defaultPrevented || window.getSelection()?.isCollapsed === false) return

		const clickTarget = event.target instanceof Element ? event.target : null
		if (!clickTarget) return

		if (clickTarget.closest(interactiveElementSelector)) return
		if (clickTarget instanceof HTMLElement && clickTarget.isContentEditable) return

		const slice = findSliceAtElement(slices, clickTarget)
		if (!slice) return

		event.preventDefault()
		event.stopPropagation()

		onSelect(slice)
	})

	useLayoutEffect(() => {
		document.addEventListener("click", selectSlice)
		return () => document.removeEventListener("click", selectSlice)
	}, [selectSlice])
}

interface SliceHighlightProps {
	slice: Slice
}

function SliceHighlight(props: SliceHighlightProps) {
	const { slice } = props
	const { sliceId, rect, label, variation } = slice

	if (!rect) return null

	const title = variation ? `${label} • ${variation}` : label

	return (
		<div
			className="slice-highlight"
			data-slice-id={sliceId}
			style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
		>
			<div className="slice-highlight-label">{title}</div>
		</div>
	)
}
