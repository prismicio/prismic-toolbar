import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks"

import { isScrollToSliceMessage, isSliceOverlayMessage } from "../message-protocol"
import type { MessageHandler, PostMessage, SubscribeToMessages } from "../message-protocol"
import { scrollToSlice } from "./scroll-to-slice"
import { findSliceAtElement } from "./slice-overlay-geometry"
import type { Slice } from "./slice-overlay-geometry"
import { useSliceRect, useSlices } from "./useSlices"
import { useStableCallback } from "./useStableCallback"

interface SliceOverlayProps {
	postMessage: PostMessage
	subscribeToMessages: SubscribeToMessages
	uiScale: number
}

export function SliceOverlay(props: SliceOverlayProps) {
	const { postMessage, subscribeToMessages, uiScale } = props

	const { slices, layout } = useSlices(subscribeToMessages)
	const selectedSlice = useSelectedSlice(slices, subscribeToMessages)
	const hoveredSlice = useHoveredSlice(slices)

	useSliceSelection(slices, uiScale, postMessage)
	useScrollToSlice(slices, uiScale, subscribeToMessages)

	return (
		<>
			{selectedSlice && <SliceHighlight slice={selectedSlice} layout={layout} />}
			{hoveredSlice && hoveredSlice !== selectedSlice && (
				<SliceHighlight slice={hoveredSlice} layout={layout} />
			)}
		</>
	)
}

function useHoveredSlice(slices: Slice[]) {
	const [target, setTarget] = useState<Element | null>(null)
	const pointer = useRef<PointerEvent>()

	// Slice highlights remain pointer-transparent so they do not block the preview. Hover and slice
	// selection therefore use document events. Interactive controls added to a highlight should use
	// `pointer-events: auto` and regular `onClick` handlers because they intentionally cover the page.
	useLayoutEffect(() => {
		function track(event: PointerEvent) {
			const hoverTarget = event.target instanceof Element ? event.target : null
			pointer.current = event
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

	// Browsers don't reliably send pointer events when the hovered element is replaced under a still
	// pointer, like when the editor re-renders the hovered slice.
	useLayoutEffect(() => {
		const event = pointer.current
		if (event && target?.isConnected === false) {
			setTarget(document.elementFromPoint(event.clientX, event.clientY))
		}
	}, [slices, target])

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

function useSliceSelection(slices: Slice[], uiScale: number, postMessage: PostMessage) {
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

		postMessage({ type: "prismic:embedded-preview:select-slice", sliceId: slice.sliceId })
		scrollToSlice(slice, uiScale)
	})

	useLayoutEffect(() => {
		document.addEventListener("click", selectSlice)
		return () => document.removeEventListener("click", selectSlice)
	}, [selectSlice])
}

function useSelectedSlice(slices: Slice[], subscribeToMessages: SubscribeToMessages) {
	const [selectedSliceId, setSelectedSliceId] = useState<string>()

	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (isSliceOverlayMessage(data)) setSelectedSliceId(data.selectedSliceId)
		})
	}, [subscribeToMessages])

	return slices.find((slice) => slice.sliceId === selectedSliceId)
}

function useScrollToSlice(
	slices: Slice[],
	uiScale: number,
	subscribeToMessages: SubscribeToMessages,
) {
	const onMessage = useStableCallback<MessageHandler>(({ data }) => {
		if (!isScrollToSliceMessage(data)) return
		const slice = slices.find((slice) => slice.sliceId === data.sliceId)
		if (slice) scrollToSlice(slice, uiScale)
	})

	useLayoutEffect(() => subscribeToMessages(onMessage), [subscribeToMessages, onMessage])
}

interface SliceHighlightProps {
	slice: Slice
	layout: EventTarget
}

function SliceHighlight(props: SliceHighlightProps) {
	const { slice, layout } = props
	const { sliceId, label, variation } = slice
	const rect = useSliceRect(slice, layout)

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
