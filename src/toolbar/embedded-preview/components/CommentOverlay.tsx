import type { TargetedMouseEvent } from "preact"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks"

import {
	clamp,
	getPinDocumentPosition,
	getPinRect,
	getPinRectFromPosition,
	isFullyVisible,
	isVisible,
	measureDocument,
} from "../comment-overlay-geometry"
import type { DocumentSize } from "../comment-overlay-geometry"
import {
	deselectPinMessageType,
	placeCommentMessageType,
	reportSelectedPinPositionMessageType,
	selectPinMessageType,
} from "../overlay-messages"
import type {
	Author,
	CommentOverlayState,
	OverlayEvent,
	PinIdentity,
	RenderedPin,
} from "../overlay-messages"
import type { ScrollToPinRequest } from "./Overlay"

interface CommentOverlayProps {
	state: CommentOverlayState
	uiScale: number
	scrollToPinRequest: ScrollToPinRequest | undefined
	onEvent: (event: OverlayEvent) => void
}

export function CommentOverlay(props: CommentOverlayProps) {
	const { state, uiScale, scrollToPinRequest, onEvent } = props

	const pinsRef = useRef<HTMLDivElement>(null)
	const lastPositionMessageRef = useRef<string>()
	const handledScrollRequestRef = useRef<number>()
	const documentSize = useDocumentSize()
	const [cursorPosition, setCursorPosition] = useState<{ left: number; top: number }>()

	const reportSelectedPinPosition = useCallback(() => {
		const pin = getSelectedPin(state, pinsRef.current)
		if (!pin) {
			lastPositionMessageRef.current = undefined
			return
		}

		const event: OverlayEvent = {
			type: reportSelectedPinPositionMessageType,
			pin: getPinIdentity(pin),
			rect: getPinRect(pin),
			visible: isVisible(pin),
		}
		const serializedEvent = JSON.stringify(event)
		if (serializedEvent === lastPositionMessageRef.current) return

		lastPositionMessageRef.current = serializedEvent
		onEvent(event)
	}, [onEvent, state])

	useLayoutEffect(reportSelectedPinPosition, [documentSize, reportSelectedPinPosition, uiScale])

	useEffect(() => {
		window.addEventListener("scroll", reportSelectedPinPosition, true)
		return () => window.removeEventListener("scroll", reportSelectedPinPosition, true)
	}, [reportSelectedPinPosition])

	useEffect(() => {
		if (!state.placementEnabled) setCursorPosition(undefined)
	}, [state.placementEnabled])

	useEffect(() => {
		const handleDocumentClick = () => {
			if (state.placementEnabled) return

			const pin = getSelectedPinIdentity(state)
			if (pin) onEvent({ type: deselectPinMessageType, pin })
		}
		document.addEventListener("click", handleDocumentClick)
		return () => document.removeEventListener("click", handleDocumentClick)
	}, [onEvent, state])

	useLayoutEffect(() => {
		if (
			!scrollToPinRequest ||
			handledScrollRequestRef.current === scrollToPinRequest.id ||
			!pinsRef.current ||
			documentSize.width === 0 ||
			documentSize.height === 0
		) {
			return
		}

		const pinState = state.pins.find(
			(candidate) => candidate.threadId === scrollToPinRequest.threadId,
		)
		const pin = Array.from(
			pinsRef.current.querySelectorAll<HTMLButtonElement>('[data-pin-type="thread"]'),
		).find((candidate) => candidate.dataset.threadId === scrollToPinRequest.threadId)
		if (!pin || !pinState) return

		handledScrollRequestRef.current = scrollToPinRequest.id
		if (isFullyVisible(pin)) {
			reportSelectedPinPosition()
			return
		}

		window.scrollTo({
			top: Math.max(0, pinState.yRatio * documentSize.height - window.innerHeight / 2),
			left: Math.max(0, pinState.xRatio * documentSize.width - window.innerWidth / 2),
			behavior: "smooth",
		})
	}, [documentSize, reportSelectedPinPosition, scrollToPinRequest, state.pins])

	function placeComment(event: TargetedMouseEvent<HTMLButtonElement>) {
		event.stopPropagation()

		if (state.draftPin) {
			onEvent({ type: deselectPinMessageType, pin: { type: "draft" } })
			return
		}

		const { width, height } = measureDocument()
		if (width === 0 || height === 0) return

		const position = {
			xRatio: clamp(event.pageX / width),
			yRatio: clamp(event.pageY / height),
		}
		onEvent({
			type: placeCommentMessageType,
			...position,
			rect: getPinRectFromPosition(position, uiScale),
		})
	}

	function updateCursorPosition(event: TargetedMouseEvent<HTMLButtonElement>) {
		setCursorPosition({ left: event.clientX, top: event.clientY })
	}

	return (
		<div className="comment-overlay">
			{state.placementEnabled && (
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
			<div className="comment-pins" ref={pinsRef}>
				{state.pins.map((pin) => (
					<Pin
						key={pin.threadId}
						pin={{
							...pin,
							selected: pin.threadId === state.selectedThreadId,
							type: "thread",
						}}
						documentSize={documentSize}
						uiScale={uiScale}
						onEvent={onEvent}
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
						documentSize={documentSize}
						uiScale={uiScale}
						onEvent={onEvent}
					/>
				)}
			</div>
			{state.placementEnabled && cursorPosition && state.draftAuthor && (
				<div
					className="pin cursor-pin"
					style={`left: ${cursorPosition.left}px; top: ${cursorPosition.top}px`}
				>
					<PinAvatar author={state.draftAuthor} />
				</div>
			)}
		</div>
	)
}

interface PinProps {
	pin: RenderedPin
	documentSize: DocumentSize
	uiScale: number
	onEvent: (event: OverlayEvent) => void
}

function Pin(props: PinProps) {
	const { pin, documentSize, uiScale, onEvent } = props

	const { left, top } = getPinDocumentPosition(pin, uiScale, documentSize)

	function handleClick(event: TargetedMouseEvent<HTMLButtonElement>) {
		if (pin.type !== "thread") return

		event.stopPropagation()
		const selected = event.currentTarget.dataset.selected === "true"
		event.currentTarget.dataset.selected = String(!selected)

		if (selected) {
			onEvent({
				type: deselectPinMessageType,
				pin: { type: "thread", threadId: pin.threadId },
			})
			return
		}

		onEvent({
			type: selectPinMessageType,
			pin: { type: "thread", threadId: pin.threadId },
			rect: getPinRect(event.currentTarget),
		})
	}

	return (
		<button
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
			<PinAvatar author={pin.author} />
		</button>
	)
}

interface PinAvatarProps {
	author: Author
}

function PinAvatar(props: PinAvatarProps) {
	const { author } = props

	const [failedAvatarURL, setFailedAvatarURL] = useState<string>()

	return (
		<span className="pin-avatar">
			{author.avatarUrl && author.avatarUrl !== failedAvatarURL ? (
				<img
					className="pin-avatar-image"
					src={author.avatarUrl}
					alt=""
					onError={() => setFailedAvatarURL(author.avatarUrl)}
				/>
			) : (
				<span className="pin-avatar-fallback">{getInitials(author.name || author.id)}</span>
			)}
		</span>
	)
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

function getSelectedPin(state: CommentOverlayState, pins: HTMLDivElement | null) {
	if (!pins) return

	if (state.draftPin) {
		return pins.querySelector<HTMLButtonElement>('[data-pin-type="draft"]') ?? undefined
	}
	if (!state.selectedThreadId) return

	return Array.from(pins.querySelectorAll<HTMLButtonElement>('[data-pin-type="thread"]')).find(
		(pin) => pin.dataset.threadId === state.selectedThreadId,
	)
}

function getPinIdentity(pin: HTMLButtonElement): PinIdentity {
	if (pin.dataset.pinType === "thread" && pin.dataset.threadId) {
		return { type: "thread", threadId: pin.dataset.threadId }
	}
	return { type: "draft" }
}

function getSelectedPinIdentity(state: CommentOverlayState): PinIdentity | undefined {
	if (state.draftPin) return { type: "draft" }
	if (state.selectedThreadId) return { type: "thread", threadId: state.selectedThreadId }
}

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/)
	return [parts[0], parts[parts.length - 1]]
		.filter((part, index) => part && (index === 0 || parts.length > 1))
		.map((part) => part.charAt(0).toLocaleUpperCase())
		.join("")
}
