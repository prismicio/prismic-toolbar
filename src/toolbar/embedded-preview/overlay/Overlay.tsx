import { useLayoutEffect, useState } from "preact/hooks"

import { isOverlayScaleMessage } from "../message-protocol"
import type { PostMessage, SubscribeToMessages } from "../message-protocol"
import { CommentOverlay } from "./CommentOverlay"

interface OverlayProps {
	postMessage: PostMessage
	subscribeToMessages: SubscribeToMessages
}

export function Overlay(props: OverlayProps) {
	const { postMessage, subscribeToMessages } = props

	const [uiScale, setUIScale] = useState(1)

	useLayoutEffect(() => {
		return subscribeToMessages(({ data }) => {
			if (isOverlayScaleMessage(data)) setUIScale(data.uiScale)
		})
	}, [subscribeToMessages])

	return (
		<div style={`--prismic-overlay-ui-scale: ${uiScale}`}>
			<CommentOverlay
				uiScale={uiScale}
				subscribeToMessages={subscribeToMessages}
				postMessage={postMessage}
			/>
		</div>
	)
}
