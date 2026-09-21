import type { ComponentChildren, RefObject, TargetedMouseEvent } from "preact"
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
	DraftPin,
	PinIdentity,
	PostMessage,
	SubscribeToMessages,
	ThreadPin,
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

type CommentOverlayState = {
	placementEnabled: boolean
	pins: ThreadPin[]
	draftAuthor?: Author
	selectedThreadId?: string
	draftPin?: DraftPin
}

export function CommentOverlay(props: CommentOverlayProps) {
	const { uiScale, subscribeToMessages, postMessage } = props

	const [state, setState] = useState<CommentOverlayState>({
		placementEnabled: false,
		pins: [],
		draftAuthor: undefined,
		selectedThreadId: undefined,
		draftPin: undefined,
	})

	const documentSize = useDocumentSize()

	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (isCommentOverlayMessage(data)) setState(data)
		})
	}, [subscribeToMessages])

	return (
		<div className="comment-overlay">
			<CommentPlacement
				placementEnabled={state.placementEnabled}
				draftAuthor={state.draftAuthor}
				draftPin={state.draftPin}
				uiScale={uiScale}
				postMessage={postMessage}
			>
				<div className="comment-pins">
					{state.pins.map((pin) => (
						<Pin
							key={pin.threadId}
							pin={{
								...pin,
								selected: !state.draftPin && pin.threadId === state.selectedThreadId,
								type: "thread",
							}}
							placementEnabled={state.placementEnabled}
							subscribeToMessages={subscribeToMessages}
							documentSize={documentSize}
							uiScale={uiScale}
							postMessage={postMessage}
						/>
					))}
					{state.draftPin && state.draftAuthor && (
						<Pin
							key="draft"
							pin={{
								...state.draftPin,
								author: state.draftAuthor,
								selected: true,
								type: "draft",
							}}
							placementEnabled={state.placementEnabled}
							subscribeToMessages={subscribeToMessages}
							documentSize={documentSize}
							uiScale={uiScale}
							postMessage={postMessage}
						/>
					)}
				</div>
			</CommentPlacement>
		</div>
	)
}

interface CommentPlacementProps {
	children: ComponentChildren
	placementEnabled: boolean
	draftAuthor: Author | undefined
	draftPin: DraftPin | undefined
	uiScale: number
	postMessage: PostMessage
}

function CommentPlacement(props: CommentPlacementProps) {
	const { children, placementEnabled, draftAuthor, draftPin, uiScale, postMessage } = props

	const [cursorPosition, setCursorPosition] = useState<{ left: number; top: number }>()

	useLayoutEffect(() => {
		if (!placementEnabled) setCursorPosition(undefined)
	}, [placementEnabled])

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

	function updateCursorPosition(event: TargetedMouseEvent<HTMLButtonElement>) {
		setCursorPosition({ left: event.clientX, top: event.clientY })
	}

	return (
		<>
			{placementEnabled && (
				<button
					type="button"
					className="placement-layer"
					aria-label="Place a comment here"
					onClick={placeComment}
					onMouseMove={updateCursorPosition}
					onMouseEnter={updateCursorPosition}
					onMouseLeave={() => setCursorPosition(undefined)}
				/>
			)}
			{children}
			{placementEnabled && cursorPosition && draftAuthor && (
				<div
					className="pin cursor-pin"
					style={`left: ${cursorPosition.left}px; top: ${cursorPosition.top}px`}
				>
					<Avatar name={draftAuthor.name || draftAuthor.id} imageUrl={draftAuthor.avatarUrl} />
				</div>
			)}
		</>
	)
}

type RenderedPin = {
	author: Author
	selected: boolean
	resolved?: boolean
	xRatio: number
	yRatio: number
} & PinIdentity

interface PinProps {
	pin: RenderedPin
	placementEnabled: boolean
	subscribeToMessages: SubscribeToMessages
	documentSize: DocumentSize
	uiScale: number
	postMessage: PostMessage
}

function Pin(props: PinProps) {
	const { pin, placementEnabled, documentSize, uiScale, postMessage, subscribeToMessages } = props
	const pinRef = useRef<HTMLButtonElement>(null)

	const { left, top } = getPinDocumentPosition(pin, uiScale, documentSize)

	useLayoutEffect(() => {
		if (pin.type !== "thread") return

		return subscribeToMessages(({ data }) => {
			if (!isScrollToPinMessage(data) || data.threadId !== pin.threadId) return
			if (!pinRef.current || isFullyVisible(pinRef.current)) return

			const { width, height } = measureDocument()
			if (width === 0 || height === 0) return

			window.scrollTo({
				top: Math.max(0, pin.yRatio * height - window.innerHeight / 2),
				left: Math.max(0, pin.xRatio * width - window.innerWidth / 2),
				behavior: "smooth",
			})
		})
	}, [pin, subscribeToMessages])

	useLayoutEffect(() => {
		if (!pin.selected || placementEnabled) return

		const identity: PinIdentity =
			pin.type === "thread" ? { type: "thread", threadId: pin.threadId } : { type: "draft" }
		const deselectPin = () => postMessage(createDeselectPinMessage(identity))
		document.addEventListener("click", deselectPin)
		return () => document.removeEventListener("click", deselectPin)
	}, [pin, placementEnabled, postMessage])

	function handleClick(event: TargetedMouseEvent<HTMLButtonElement>) {
		if (pin.type !== "thread") return

		event.stopPropagation()

		if (pin.selected) {
			postMessage(createDeselectPinMessage({ type: "thread", threadId: pin.threadId }))
			return
		}

		postMessage(
			createSelectPinMessage({
				pin: { type: "thread", threadId: pin.threadId },
				rect: getPinRect(event.currentTarget),
			}),
		)
	}

	return (
		<>
			<button
				ref={pinRef}
				type="button"
				className="pin"
				style={`left: ${left}px; top: ${top}px`}
				data-pin-type={pin.type}
				data-thread-id={pin.type === "thread" ? pin.threadId : undefined}
				data-selected={String(pin.selected)}
				data-resolved={String(Boolean(pin.resolved))}
				aria-label={
					pin.type === "thread" ? `Open comment by ${pin.author.name || "author"}` : "New comment"
				}
				disabled={pin.type === "draft"}
				onClick={pin.type === "thread" ? handleClick : undefined}
			>
				<Avatar name={pin.author.name || pin.author.id} imageUrl={pin.author.avatarUrl} />
			</button>
			{pin.selected && (
				<PinPositionReporter
					pin={
						pin.type === "thread" ? { type: "thread", threadId: pin.threadId } : { type: "draft" }
					}
					pinRef={pinRef}
					postMessage={postMessage}
					subscribeToMessages={subscribeToMessages}
				/>
			)}
		</>
	)
}

interface PinPositionReporterProps {
	pin: PinIdentity
	pinRef: RefObject<HTMLButtonElement>
	postMessage: PostMessage
	subscribeToMessages: SubscribeToMessages
}

function PinPositionReporter(props: PinPositionReporterProps) {
	const { pin, pinRef, postMessage, subscribeToMessages } = props

	const reportPosition = useCallback(() => {
		if (!pinRef.current) return

		postMessage(
			createReportSelectedPinPositionMessage({
				pin,
				rect: getPinRect(pinRef.current),
				visible: isVisible(pinRef.current),
			}),
		)
	}, [pin, pinRef, postMessage])

	// The parent renders again when the pin, document size, or UI scale changes.
	useLayoutEffect(reportPosition)

	useLayoutEffect(() => {
		window.addEventListener("scroll", reportPosition)
		return () => window.removeEventListener("scroll", reportPosition)
	}, [reportPosition])

	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (pin.type !== "thread" || !isScrollToPinMessage(data) || data.threadId !== pin.threadId)
				return
			if (pinRef.current && isFullyVisible(pinRef.current)) reportPosition()
		})
	}, [pin, pinRef, reportPosition, subscribeToMessages])

	return null
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
