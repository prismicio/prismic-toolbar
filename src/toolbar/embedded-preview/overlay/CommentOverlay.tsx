import type { RefObject, TargetedMouseEvent } from "preact"
import { useCallback, useLayoutEffect, useRef, useState } from "preact/hooks"

import {
	createDeselectPinMessage,
	createPlaceCommentMessage,
	createReportSelectedPinPositionMessage,
	createSelectPinMessage,
	isCommentOverlayMessage,
	isScrollToPinMessage,
} from "../message-protocol"
import type {
	Author,
	PinIdentity,
	PinPosition,
	PostMessage,
	SubscribeToMessages,
	ThreadPinData,
} from "../message-protocol"
import { Avatar } from "./Avatar"
import {
	clamp,
	getPinDocumentPosition,
	getPinRect,
	getPinRectFromPosition,
	isFullyVisible,
	isVisible,
	measureDocument,
} from "./comment-overlay-geometry"
import type { DocumentSize } from "./comment-overlay-geometry"

interface CommentOverlayProps {
	uiScale: number
	subscribeToMessages: SubscribeToMessages
	postMessage: PostMessage
}

export function CommentOverlay(props: CommentOverlayProps) {
	const { uiScale, subscribeToMessages, postMessage } = props
	const state = useCommentOverlayState(subscribeToMessages)
	const { placementEnabled, pins, draftAuthor, selectedThreadId, draftPin } = state

	const documentSize = useDocumentSize()

	const selectedPin = getSelectedPinIdentity(state)

	useDismissOnClick(placementEnabled ? undefined : selectedPin, postMessage)

	return (
		<>
			{placementEnabled && (
				<PlacementLayer
					draftAuthor={draftAuthor}
					draftPin={draftPin}
					uiScale={uiScale}
					postMessage={postMessage}
				/>
			)}
			{pins.map((pin) => (
				<ThreadPin
					key={pin.threadId}
					pin={pin}
					selected={!draftPin && pin.threadId === selectedThreadId}
					subscribeToMessages={subscribeToMessages}
					documentSize={documentSize}
					uiScale={uiScale}
					postMessage={postMessage}
				/>
			))}
			{draftPin && draftAuthor && (
				<DraftPin
					position={draftPin}
					author={draftAuthor}
					documentSize={documentSize}
					uiScale={uiScale}
					postMessage={postMessage}
				/>
			)}
		</>
	)
}

interface PlacementLayerProps {
	draftAuthor: Author | undefined
	draftPin: PinPosition | undefined
	uiScale: number
	postMessage: PostMessage
}

function PlacementLayer(props: PlacementLayerProps) {
	const { draftAuthor, draftPin, uiScale, postMessage } = props

	const [cursorPosition, setCursorPosition] = useState<{ left: number; top: number }>()

	function placeComment(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()

		if (draftPin) {
			postMessage(createDeselectPinMessage({ type: "draft" }))
			return
		}

		const { width, height } = measureDocument()
		if (width === 0 || height === 0) return

		const position = {
			xRatio: clamp(event.pageX / width),
			yRatio: clamp(event.pageY / height),
		}
		postMessage(
			createPlaceCommentMessage({
				...position,
				rect: getPinRectFromPosition(position, uiScale),
			}),
		)
	}

	function trackCursor(event: TargetedMouseEvent<HTMLButtonElement>) {
		setCursorPosition({ left: event.clientX, top: event.clientY })
	}

	return (
		<>
			<button
				type="button"
				className="placement-layer"
				aria-label="Place a comment here"
				onClick={placeComment}
				onMouseMove={trackCursor}
				onMouseEnter={trackCursor}
				onMouseLeave={() => setCursorPosition(undefined)}
			/>
			{cursorPosition && draftAuthor && (
				<CursorPin position={cursorPosition} author={draftAuthor} />
			)}
		</>
	)
}

interface CursorPinProps {
	position: { left: number; top: number }
	author: Author
}

function CursorPin(props: CursorPinProps) {
	const { position, author } = props

	return (
		<div className="pin cursor-pin" style={{ left: position.left, top: position.top }}>
			<Avatar name={author.name || author.id} imageUrl={author.avatarUrl} />
		</div>
	)
}

interface ThreadPinProps {
	pin: ThreadPinData
	selected: boolean
	subscribeToMessages: SubscribeToMessages
	documentSize: DocumentSize
	uiScale: number
	postMessage: PostMessage
}

function ThreadPin(props: ThreadPinProps) {
	const { pin, selected, documentSize, uiScale, postMessage, subscribeToMessages } = props

	const pinRef = useRef<HTMLButtonElement>(null)
	const identity = { type: "thread", threadId: pin.threadId } as const
	const reportPosition = useReportSelectedPinPosition(
		pinRef,
		selected ? identity : undefined,
		postMessage,
	)

	useScrollToThreadPin(pinRef, pin, reportPosition, subscribeToMessages)

	function handleClick(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()

		if (selected) {
			postMessage(createDeselectPinMessage(identity))
			return
		}

		postMessage(createSelectPinMessage({ pin: identity, rect: getPinRect(event.currentTarget) }))
	}

	return (
		<Pin
			pinRef={pinRef}
			position={pin}
			author={pin.author}
			documentSize={documentSize}
			uiScale={uiScale}
			dimmed={pin.resolved && !selected}
			data-thread-id={pin.threadId}
			aria-label={`Open comment by ${pin.author.name || pin.author.id}`}
			aria-pressed={selected}
			onClick={handleClick}
		/>
	)
}

interface DraftPinProps {
	position: PinPosition
	author: Author
	documentSize: DocumentSize
	uiScale: number
	postMessage: PostMessage
}

function DraftPin(props: DraftPinProps) {
	const { position, author, documentSize, uiScale, postMessage } = props

	const pinRef = useRef<HTMLButtonElement>(null)

	useReportSelectedPinPosition(pinRef, { type: "draft" }, postMessage)

	return (
		<Pin
			pinRef={pinRef}
			position={position}
			author={author}
			documentSize={documentSize}
			uiScale={uiScale}
			aria-label="New comment"
			disabled
		/>
	)
}

interface PinProps {
	pinRef: RefObject<HTMLButtonElement>
	position: PinPosition
	author: Author
	documentSize: DocumentSize
	uiScale: number
	dimmed?: boolean
	disabled?: boolean
	onClick?: (event: TargetedMouseEvent<HTMLButtonElement>) => void
	"aria-label"?: string
	"aria-pressed"?: boolean
	"data-thread-id"?: string
}

function Pin(props: PinProps) {
	const { pinRef, position, author, documentSize, uiScale, dimmed, ...rest } = props

	const { left, top } = getPinDocumentPosition(position, uiScale, documentSize)

	return (
		<button
			{...rest}
			ref={pinRef}
			type="button"
			className={`pin ${dimmed ? "pin-dimmed" : ""}`}
			style={{ left, top }}
		>
			<Avatar name={author.name || author.id} imageUrl={author.avatarUrl} />
		</button>
	)
}

type CommentOverlayState = {
	placementEnabled: boolean
	pins: ThreadPinData[]
	draftAuthor?: Author
	selectedThreadId?: string
	draftPin?: PinPosition
}

function getSelectedPinIdentity(state: CommentOverlayState): PinIdentity | undefined {
	const { draftPin, draftAuthor, selectedThreadId, pins } = state

	if (draftPin && draftAuthor) return { type: "draft" }
	if (selectedThreadId === undefined) return
	if (!pins.some((pin) => pin.threadId === selectedThreadId)) return

	return { type: "thread", threadId: selectedThreadId }
}

function useCommentOverlayState(subscribeToMessages: SubscribeToMessages) {
	const [state, setState] = useState<CommentOverlayState>({
		placementEnabled: false,
		pins: [],
	})

	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (isCommentOverlayMessage(data)) setState(data)
		})
	}, [subscribeToMessages])

	return state
}

function useDismissOnClick(pin: PinIdentity | undefined, postMessage: PostMessage) {
	useLayoutEffect(() => {
		if (!pin) return

		const deselectPin = () => postMessage(createDeselectPinMessage(pin))
		document.addEventListener("click", deselectPin)
		return () => document.removeEventListener("click", deselectPin)
	}, [pin, postMessage])
}

function useScrollToThreadPin(
	pinRef: RefObject<HTMLButtonElement>,
	pin: ThreadPinData,
	reportPosition: () => void,
	subscribeToMessages: SubscribeToMessages,
) {
	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (!isScrollToPinMessage(data) || data.threadId !== pin.threadId) return
			if (!pinRef.current) return

			if (isFullyVisible(pinRef.current)) {
				reportPosition()
				return
			}

			const { width, height } = measureDocument()
			if (width === 0 || height === 0) return

			window.scrollTo({
				top: Math.max(0, pin.yRatio * height - window.innerHeight / 2),
				left: Math.max(0, pin.xRatio * width - window.innerWidth / 2),
				behavior: "smooth",
			})
		})
	}, [pin, pinRef, reportPosition, subscribeToMessages])
}

function useReportSelectedPinPosition(
	pinRef: RefObject<HTMLButtonElement>,
	pin: PinIdentity | undefined,
	postMessage: PostMessage,
) {
	const reportPosition = useCallback(() => {
		if (!pin || !pinRef.current) return

		postMessage(
			createReportSelectedPinPositionMessage({
				pin,
				rect: getPinRect(pinRef.current),
				visible: isVisible(pinRef.current),
			}),
		)
	}, [pin, pinRef, postMessage])

	useLayoutEffect(reportPosition)

	useLayoutEffect(() => {
		if (!pin) return

		window.addEventListener("scroll", reportPosition)
		return () => window.removeEventListener("scroll", reportPosition)
	}, [pin, reportPosition])

	return reportPosition
}

function useDocumentSize() {
	const [documentSize, setDocumentSize] = useState<DocumentSize>({ width: 0, height: 0 })

	useLayoutEffect(() => {
		const updateDocumentSize = () => {
			const nextDocumentSize = measureDocument()
			setDocumentSize((currentDocumentSize) => {
				if (
					currentDocumentSize.width === nextDocumentSize.width &&
					currentDocumentSize.height === nextDocumentSize.height
				) {
					return currentDocumentSize
				}
				return nextDocumentSize
			})
		}
		const resizeObserver = new ResizeObserver(updateDocumentSize)

		updateDocumentSize()
		resizeObserver.observe(document.documentElement)
		resizeObserver.observe(document.body)
		window.addEventListener("resize", updateDocumentSize)

		return () => {
			resizeObserver.disconnect()
			window.removeEventListener("resize", updateDocumentSize)
		}
	}, [])

	return documentSize
}
