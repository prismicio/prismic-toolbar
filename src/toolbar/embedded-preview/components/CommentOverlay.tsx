import type { RefObject, TargetedMouseEvent } from "preact"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "preact/hooks"

import {
	clamp,
	getPinRect,
	getPinRectFromPosition,
	isFullyVisible,
	isVisible,
	measureDocument,
	positionPin,
} from "../comment-overlay-geometry"
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
	rootRef: RefObject<HTMLDivElement>
	state: CommentOverlayState
	uiScale: number
	scrollToPinRequest: ScrollToPinRequest | undefined
	onEvent: (event: OverlayEvent) => void
}

export function CommentOverlay({
	rootRef,
	state,
	uiScale,
	scrollToPinRequest,
	onEvent,
}: CommentOverlayProps) {
	const pinsRef = useRef<HTMLDivElement>(null)
	const positionReportFrameRef = useRef<number>()
	const reportSelectedPinPositionRef = useRef<() => void>(() => {})
	const lastPositionMessageRef = useRef<string>()
	const handledScrollRequestRef = useRef<number>()
	const [layoutVersion, setLayoutVersion] = useState(0)
	const [cursorPosition, setCursorPosition] = useState<{ left: number; top: number }>()
	const selectedPinKey = getSelectedPinKey(state)

	const reportSelectedPinPosition = useCallback(() => {
		const pin = getSelectedPin(state, pinsRef.current)
		if (!pin) return

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

	useLayoutEffect(() => {
		reportSelectedPinPositionRef.current = reportSelectedPinPosition
	}, [reportSelectedPinPosition])

	const reportSelectedPinPositionSoon = useCallback(() => {
		if (positionReportFrameRef.current !== undefined) return

		positionReportFrameRef.current = window.requestAnimationFrame(() => {
			positionReportFrameRef.current = undefined
			reportSelectedPinPositionRef.current()
		})
	}, [])

	useEffect(() => {
		return () => {
			if (positionReportFrameRef.current !== undefined) {
				window.cancelAnimationFrame(positionReportFrameRef.current)
			}
		}
	}, [])

	useEffect(() => {
		lastPositionMessageRef.current = undefined
		reportSelectedPinPositionSoon()
	}, [reportSelectedPinPositionSoon, selectedPinKey])

	useEffect(() => {
		if (!state.placementEnabled) setCursorPosition(undefined)
	}, [state.placementEnabled])

	useEffect(() => {
		reportSelectedPinPositionSoon()
	}, [layoutVersion, reportSelectedPinPositionSoon, state, uiScale])

	useEffect(() => {
		const handleResize = () => {
			setLayoutVersion((version) => version + 1)
			reportSelectedPinPositionSoon()
		}
		const resizeObserver = new ResizeObserver(handleResize)
		resizeObserver.observe(document.documentElement)
		resizeObserver.observe(document.body)
		window.addEventListener("scroll", reportSelectedPinPositionSoon, true)
		window.addEventListener("resize", handleResize)

		return () => {
			resizeObserver.disconnect()
			window.removeEventListener("scroll", reportSelectedPinPositionSoon, true)
			window.removeEventListener("resize", handleResize)
		}
	}, [reportSelectedPinPositionSoon])

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
			!pinsRef.current
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
			reportSelectedPinPositionSoon()
			return
		}

		const { width, height } = measureDocument()
		window.scrollTo({
			top: Math.max(0, pinState.yRatio * height - window.innerHeight / 2),
			left: Math.max(0, pinState.xRatio * width - window.innerWidth / 2),
			behavior: "smooth",
		})
	}, [layoutVersion, reportSelectedPinPositionSoon, scrollToPinRequest, state.pins, uiScale])

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
						rootRef={rootRef}
						pin={{
							...pin,
							selected: pin.threadId === state.selectedThreadId,
							type: "thread",
						}}
						uiScale={uiScale}
						layoutVersion={layoutVersion}
						onEvent={onEvent}
					/>
				))}
				{state.draftPin && state.draftAuthor && (
					<Pin
						key="draft"
						rootRef={rootRef}
						pin={{
							...state.draftPin,
							author: state.draftAuthor,
							selected: true,
							type: "draft",
						}}
						uiScale={uiScale}
						layoutVersion={layoutVersion}
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
	rootRef: RefObject<HTMLDivElement>
	pin: RenderedPin
	uiScale: number
	layoutVersion: number
	onEvent: (event: OverlayEvent) => void
}

function Pin({ rootRef, pin, uiScale, layoutVersion, onEvent }: PinProps) {
	const pinRef = useRef<HTMLButtonElement>(null)

	useLayoutEffect(() => {
		if (!pinRef.current || !rootRef.current) return
		positionPin(pinRef.current, pin, uiScale, rootRef.current)
	}, [layoutVersion, pin, rootRef, uiScale])

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
			ref={pinRef}
			type="button"
			className="pin"
			data-pin-type={pin.type}
			data-thread-id={pin.type === "thread" ? pin.threadId : undefined}
			data-selected={String(pin.selected)}
			data-resolved={String(Boolean(pin.resolved))}
			data-x-ratio={String(pin.xRatio)}
			data-y-ratio={String(pin.yRatio)}
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

function PinAvatar({ author }: { author: Author }) {
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

function getSelectedPinKey(state: CommentOverlayState) {
	if (state.draftPin) return "draft"
	return state.selectedThreadId
}

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/)
	return [parts[0], parts[parts.length - 1]]
		.filter((part, index) => part && (index === 0 || parts.length > 1))
		.map((part) => part.charAt(0).toLocaleUpperCase())
		.join("")
}
