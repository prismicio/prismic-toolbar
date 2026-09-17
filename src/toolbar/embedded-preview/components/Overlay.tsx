import { useRef } from "preact/hooks"

import type { CommentOverlayState, OverlayEvent } from "../overlay-messages"
import { CommentOverlay } from "./CommentOverlay"

export interface ScrollToPinRequest {
	id: number
	threadId: string
}

interface OverlayProps {
	uiScale: number
	commentState: CommentOverlayState
	scrollToPinRequest: ScrollToPinRequest | undefined
	onEvent: (event: OverlayEvent) => void
}

export function Overlay({ uiScale, commentState, scrollToPinRequest, onEvent }: OverlayProps) {
	const rootRef = useRef<HTMLDivElement>(null)

	return (
		<div className="overlay" ref={rootRef} style={`--prismic-overlay-ui-scale: ${uiScale}`}>
			<CommentOverlay
				rootRef={rootRef}
				state={commentState}
				uiScale={uiScale}
				scrollToPinRequest={scrollToPinRequest}
				onEvent={onEvent}
			/>
		</div>
	)
}
