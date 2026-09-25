import { appendCSS, shadow } from "@common"
import { render } from "preact"

import type { PostMessage, SubscribeToMessages } from "../message-protocol"
import { Overlay } from "./Overlay"

import shadowStyles from "./index.css?inline"

export class EmbeddedPreviewOverlay {
	constructor({
		postMessage,
		subscribeToMessages,
	}: {
		postMessage: PostMessage
		subscribeToMessages: SubscribeToMessages
	}) {
		const root = shadow({
			id: "prismic-embedded-preview-overlay",
			style: {
				position: "absolute",
				top: 0,
				left: 0,
				width: 0,
				height: 0,
				zIndex: 2147483646,
				pointerEvents: "none",
			},
		})
		appendCSS(root, shadowStyles)
		render(<Overlay postMessage={postMessage} subscribeToMessages={subscribeToMessages} />, root)
	}
}
