import { useCallback, useLayoutEffect, useState } from "preact/hooks"

import {
	isCommentOverlayMessage,
	isOverlayScaleMessage,
	isScrollToPinMessage,
} from "../overlay-messages"
import type {
	CommentOverlayState,
	OverlayEvent,
	SubscribeToOverlayMessages,
} from "../overlay-messages"
import { CommentOverlay } from "./CommentOverlay"
import { SliceOverlay } from "./SliceOverlay"

export interface ScrollToPinRequest {
	threadId: string
}

const emptyCommentState: CommentOverlayState = {
	placementEnabled: false,
	pins: [],
}

interface OverlayProps {
	parentOrigin: string
	subscribeToMessages: SubscribeToOverlayMessages
}

export function Overlay(props: OverlayProps) {
	const { parentOrigin, subscribeToMessages } = props

	const [uiScale, setUIScale] = useState(1)
	const [commentState, setCommentState] = useState(emptyCommentState)
	const [scrollToPinRequest, setScrollToPinRequest] = useState<ScrollToPinRequest>()

	useLayoutEffect(() => {
		return subscribeToMessages((data) => {
			if (isOverlayScaleMessage(data)) {
				setUIScale(data.uiScale)
			} else if (isCommentOverlayMessage(data)) {
				setCommentState(data)
			} else if (isScrollToPinMessage(data)) {
				setScrollToPinRequest({ threadId: data.threadId })
			}
		})
	}, [subscribeToMessages])

	const post = useCallback(
		(event: OverlayEvent) => window.parent.postMessage(event, parentOrigin),
		[parentOrigin],
	)
	const clearScrollToPinRequest = useCallback(() => setScrollToPinRequest(undefined), [])

	return (
		<div className="overlay" style={`--prismic-overlay-ui-scale: ${uiScale}`}>
			<SliceOverlay />
			<CommentOverlay
				state={commentState}
				uiScale={uiScale}
				scrollToPinRequest={scrollToPinRequest}
				onScrollToPinHandled={clearScrollToPinRequest}
				onEvent={post}
			/>
		</div>
	)
}
