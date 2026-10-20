import type { TargetedMouseEvent } from "preact"
import type { SVGProps } from "preact/compat"
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
	const { selectedSliceId, readOnly } = useSliceOverlayState(subscribeToMessages)

	const selectedSlice = useSelectedSlice(slices, selectedSliceId)
	const hoveredSlice = useHoveredSlice(slices)

	useSliceSelection(slices, uiScale, postMessage)
	useScrollToSlice(slices, uiScale, subscribeToMessages)

	return (
		<>
			{selectedSlice && (
				<SliceHighlight
					slice={selectedSlice}
					layout={layout}
					readOnly={readOnly}
					postMessage={postMessage}
				/>
			)}
			{hoveredSlice && hoveredSlice !== selectedSlice && (
				<SliceHighlight
					slice={hoveredSlice}
					layout={layout}
					readOnly={readOnly}
					postMessage={postMessage}
				/>
			)}
		</>
	)
}

function useSelectedSlice(slices: Slice[], selectedSliceId?: string) {
	if (!selectedSliceId) return undefined
	return slices.find((slice) => slice.sliceId === selectedSliceId)
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

function useSliceOverlayState(subscribeToMessages: SubscribeToMessages) {
	const [state, setState] = useState<{ selectedSliceId?: string; readOnly?: boolean }>({})

	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (isSliceOverlayMessage(data)) setState(data)
		})
	}, [subscribeToMessages])

	return { ...state, readOnly: state.readOnly ?? true }
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
	readOnly: boolean
	postMessage: PostMessage
}

function SliceHighlight(props: SliceHighlightProps) {
	const { slice, layout, readOnly, postMessage } = props
	const { sliceId, label, variation } = slice
	const rect = useSliceRect(slice, layout)

	if (!rect) return null

	function handleMove(event: TargetedMouseEvent<HTMLButtonElement>, direction: "up" | "down") {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:move-slice", sliceId, direction })
	}

	function handleDelete(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:delete-slice", sliceId })
	}

	return (
		<div
			className="slice-highlight"
			data-slice-id={sliceId}
			style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
			onPointerOver={(event) => event.stopPropagation()}
			onPointerMove={(event) => event.stopPropagation()}
		>
			<div className="slice-control-group slice-title-group">
				<div className="slice-title">
					<span className="slice-label">{label}</span>
					{variation && (
						<span className="slice-variation">
							{" • "}
							{variation}
						</span>
					)}
				</div>
			</div>
			{!readOnly && (
				<div className="slice-control-group slice-move-group">
					<button
						type="button"
						className="slice-button"
						aria-label="Move slice up"
						title="Move slice up"
						disabled={!slice.canMoveUp}
						onClick={(event) => handleMove(event, "up")}
					>
						<ArrowUpIcon className="slice-button-icon" />
					</button>
					<button
						type="button"
						className="slice-button"
						aria-label="Move slice down"
						title="Move slice down"
						disabled={!slice.canMoveDown}
						onClick={(event) => handleMove(event, "down")}
					>
						<ArrowDownIcon className="slice-button-icon" />
					</button>
				</div>
			)}
			{!readOnly && (
				<div className="slice-control-group slice-control-group-right">
					<button
						type="button"
						className="slice-button"
						aria-label="Delete slice"
						title="Delete slice"
						onClick={handleDelete}
					>
						<DeleteIcon className="slice-button-icon" />
					</button>
				</div>
			)}
		</div>
	)
}

const DeleteIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg viewBox="0 0 16 16" fill="none" {...props}>
		<path
			d="M12.1757 6.88889L11.8667 12.7556C11.8169 13.7068 11.0364 14.4444 10.0916 14.4444H5.90937C4.9636 14.4444 4.18403 13.7067 4.13425 12.7556L3.8252 6.88889"
			stroke="currentColor"
			stroke-width="1.33333"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M2.44434 4.22222H13.5554"
			stroke="currentColor"
			stroke-width="1.33333"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<path
			d="M6 4.22222V2.44445C6 1.95556 6.39822 1.55556 6.88889 1.55556H9.11111C9.60178 1.55556 10 1.95556 10 2.44445V4.22222"
			stroke="currentColor"
			stroke-width="1.33333"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
)

function ArrowUpIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" fill="none" {...props}>
			<path
				d="M8 13V3m-4 4 4-4 4 4"
				stroke="currentColor"
				stroke-width="1.33333"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}

function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 16 16" fill="none" {...props}>
			<path
				d="M8 3v10m-4-4 4 4 4-4"
				stroke="currentColor"
				stroke-width="1.33333"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	)
}
