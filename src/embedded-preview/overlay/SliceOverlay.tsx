import type { TargetedMouseEvent } from "preact"
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
	const { selectedSliceId, canDelete } = useSliceOverlayState(subscribeToMessages)
	const selectedSlice = slices.find((slice) => slice.sliceId === selectedSliceId)
	const hoveredSlice = useHoveredSlice(slices)

	useSliceSelection(slices, uiScale, postMessage)
	useScrollToSlice(slices, uiScale, subscribeToMessages)

	return (
		<>
			{selectedSlice && (
				<SliceHighlight
					slice={selectedSlice}
					layout={layout}
					canDelete={canDelete}
					postMessage={postMessage}
				/>
			)}
			{hoveredSlice && hoveredSlice !== selectedSlice && (
				<SliceHighlight
					slice={hoveredSlice}
					layout={layout}
					canDelete={canDelete}
					postMessage={postMessage}
				/>
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
			const hoverTarget = event.composedPath()[0]
			pointer.current = event
			setTarget(hoverTarget instanceof Element ? hoverTarget : null)
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

	const slice = useMemo(() => {
		const highlight = target?.closest(".slice-highlight")
		if (highlight)
			return slices.find((slice) => slice.sliceId === highlight.getAttribute("data-slice-id"))
		return findSliceAtElement(slices, target)
	}, [slices, target])

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

function useSliceOverlayState(subscribeToMessages: SubscribeToMessages) {
	const [state, setState] = useState<{ selectedSliceId?: string; canDelete?: boolean }>({})

	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (isSliceOverlayMessage(data)) setState(data)
		})
	}, [subscribeToMessages])

	return state
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
	canDelete: boolean | undefined
	postMessage: PostMessage
}

function SliceHighlight(props: SliceHighlightProps) {
	const { slice, layout, canDelete, postMessage } = props
	const { sliceId, label, variation } = slice
	const rect = useSliceRect(slice, layout)

	if (!rect) return null

	const title = variation ? `${label} • ${variation}` : label

	function handleDelete(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:delete-slice", sliceId })
	}

	return (
		<div
			className="slice-highlight"
			data-slice-id={sliceId}
			style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
		>
			<div className="slice-highlight-label">{title}</div>
			{canDelete && (
				<button
					type="button"
					className="slice-delete"
					aria-label="Delete slice"
					title="Delete slice"
					onClick={handleDelete}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7" />
					</svg>
				</button>
			)}
		</div>
	)
}
