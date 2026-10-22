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

	function handleChangeVariation(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:change-slice-variation", sliceId })
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
				<div className="slice-control-group">
					{variation !== undefined && (
						<button
							type="button"
							className="slice-button"
							aria-label="Change variation"
							title="Change variation"
							onClick={handleChangeVariation}
						>
							<DescriptionIcon className="slice-button-icon" />
						</button>
					)}
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
	<svg viewBox="0 0 24 24" fill="currentColor" {...props}>
		<path d="M16 9V19H8V9H16ZM14.5 3H9.5L8.5 4H5V6H19V4H15.5L14.5 3ZM18 7H6V19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7Z" />
	</svg>
)

function DescriptionIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" {...props}>
			<path d="M8 16H16V18H8V16ZM8 12H16V14H8V12ZM14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" />
		</svg>
	)
}
