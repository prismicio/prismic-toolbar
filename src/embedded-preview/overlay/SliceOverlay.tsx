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
	const { selectedSliceId, readOnly, agentEnabled } = useSliceOverlayState(subscribeToMessages)

	const selectedSlice = useSelectedSlice(slices, selectedSliceId)
	const hoveredSlice = useHoveredSlice(slices)
	const hoveredSliceDistance = useDistanceBetweenSelectedAndHoveredSlice(
		selectedSlice,
		hoveredSlice,
	)

	useSliceSelection(slices, uiScale, postMessage)
	useScrollToSlice(slices, uiScale, subscribeToMessages)

	return (
		<>
			{selectedSlice && (
				<SliceHighlight
					slice={selectedSlice}
					agentEnabled={agentEnabled}
					layout={layout}
					readOnly={readOnly}
					postMessage={postMessage}
				/>
			)}
			{hoveredSlice && hoveredSlice !== selectedSlice && (
				<SliceHighlight
					slice={hoveredSlice}
					agentEnabled={agentEnabled}
					layout={layout}
					readOnly={readOnly}
					postMessage={postMessage}
					hideInsertBefore={hoveredSliceDistance === 1}
					hideInsertAfter={hoveredSliceDistance === -1}
				/>
			)}
		</>
	)
}

function useDistanceBetweenSelectedAndHoveredSlice(selectedSlice?: Slice, hoveredSlice?: Slice) {
	if (!selectedSlice || !hoveredSlice) return
	if (selectedSlice.zoneId === undefined || selectedSlice.zoneId !== hoveredSlice.zoneId) return
	if (selectedSlice.index === undefined || hoveredSlice.index === undefined) return
	return hoveredSlice.index - selectedSlice.index
}

function useSelectedSlice(slices: Slice[], selectedSliceId?: string) {
	if (!selectedSliceId) return undefined
	return slices.find((slice) => slice.sliceId === selectedSliceId)
}

function useHoveredSlice(slices: Slice[]) {
	const [target, setTarget] = useState<Element | null>(null)
	const pointer = useRef<PointerEvent | undefined>(undefined)

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
	const [state, setState] = useState<{
		selectedSliceId?: string
		readOnly?: boolean
		agentEnabled?: boolean
	}>({})

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
	agentEnabled?: boolean
	postMessage: PostMessage
	hideInsertBefore?: boolean
	hideInsertAfter?: boolean
}

function SliceHighlight(props: SliceHighlightProps) {
	const { slice, layout, readOnly, agentEnabled, postMessage, hideInsertBefore, hideInsertAfter } =
		props
	const { sliceId, label, variation } = slice
	const rect = useSliceRect(slice, layout)

	if (!rect) return null

	function handleMove(event: TargetedMouseEvent<HTMLButtonElement>, direction: "up" | "down") {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:move-slice", sliceId, direction })
	}

	function handleChangeVariation(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:change-slice-variation", sliceId })
	}

	function handleAskAgent(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:ask-slice-agent", sliceId })
	}

	function handleDelete(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:delete-slice", sliceId })
	}

	return (
		<div
			className="slice-highlight"
			data-slice-id={sliceId}
			style={{
				top: `${rect.top}px`,
				left: `${rect.left}px`,
				width: `${rect.width}px`,
				height: `${rect.height}px`,
			}}
			onPointerOver={(event) => event.stopPropagation()}
			onPointerMove={(event) => event.stopPropagation()}
		>
			{!readOnly && !hideInsertBefore && (
				<InsertSliceButton sliceId={sliceId} position="before" postMessage={postMessage} />
			)}
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
						<SliceIcon path="M4 12L5.41 13.41L11 7.83V20H13V7.83L18.58 13.42L20 12L12 4L4 12Z" />
					</button>
					<button
						type="button"
						className="slice-button"
						aria-label="Move slice down"
						title="Move slice down"
						disabled={!slice.canMoveDown}
						onClick={(event) => handleMove(event, "down")}
					>
						<SliceIcon path="M20 12L18.59 10.59L13 16.17V4H11V16.17L5.42 10.58L4 12L12 20L20 12Z" />
					</button>
				</div>
			)}
			{(!readOnly || agentEnabled) && (
				<div className="slice-control-group slice-control-group-right">
					{agentEnabled && (
						<button
							type="button"
							className="slice-button"
							aria-label="Ask AI about this slice"
							title="Ask AI about this slice"
							onClick={handleAskAgent}
						>
							{/* Same static shape as editor-ui, without the Motion dependency. */}
							<SliceIcon
								viewBox="-2 -0.76855 20 20"
								path="M8 2.23145C8.63942 2.23145 8.84135 2.83721 8.97596 3.44298C9.48077 6.13529 11.0962 7.75068 13.7885 8.25548C14.3942 8.3901 15 8.59202 15 9.23145C15 9.87087 14.3942 10.0728 13.7885 10.2074C11.0962 10.7122 9.48077 12.3276 8.97596 15.0199C8.84135 15.6257 8.63942 16.2314 8 16.2314C7.36058 16.2314 7.15865 15.6257 7.02404 15.0199C6.51923 12.3276 4.90385 10.7122 2.21154 10.2074C1.60577 10.0728 1 9.87087 1 9.23145C1 8.59202 1.60577 8.3901 2.21154 8.25548C4.90385 7.75068 6.51923 6.13529 7.02404 3.44298C7.15865 2.83721 7.36058 2.23145 8 2.23145Z"
							/>
						</button>
					)}
					{!readOnly && variation !== undefined && (
						<button
							type="button"
							className="slice-button"
							aria-label="Change variation"
							title="Change variation"
							onClick={handleChangeVariation}
						>
							<SliceIcon path="M8 16H16V18H8V16ZM8 12H16V14H8V12ZM14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" />
						</button>
					)}
					{!readOnly && (
						<button
							type="button"
							className="slice-button"
							aria-label="Delete slice"
							title="Delete slice"
							onClick={handleDelete}
						>
							<SliceIcon path="M16 9V19H8V9H16ZM14.5 3H9.5L8.5 4H5V6H19V4H15.5L14.5 3ZM18 7H6V19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7Z" />
						</button>
					)}
				</div>
			)}
			{!readOnly && !hideInsertAfter && (
				<InsertSliceButton sliceId={sliceId} position="after" postMessage={postMessage} />
			)}
		</div>
	)
}

interface InsertSliceButtonProps {
	sliceId: string
	position: "before" | "after"
	postMessage: PostMessage
}

function InsertSliceButton(props: InsertSliceButtonProps) {
	const { sliceId, position, postMessage } = props
	const label = `Add slice ${position}`

	function handleClick(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()
		postMessage({ type: "prismic:embedded-preview:insert-slice", sliceId, position })
	}

	return (
		<button
			type="button"
			className="slice-button slice-insert-button"
			data-position={position}
			aria-label={label}
			title={label}
			onClick={handleClick}
		>
			<SliceIcon path="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
		</button>
	)
}

function SliceIcon({ path, ...props }: SVGProps<SVGSVGElement> & { path: string }) {
	return (
		<svg
			aria-hidden="true"
			className="slice-button-icon"
			viewBox="0 0 24 24"
			fill="currentColor"
			{...props}
		>
			<path d={path} />
		</svg>
	)
}
