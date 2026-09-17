import { appendCSS, shadow } from "@common"
import { render } from "preact"

import { Overlay } from "./components/Overlay"
import type { SubscribeToOverlayMessages } from "./overlay-messages"

import overlayStyles from "./overlay.css?inline"

export class EmbeddedPreviewOverlay {
	private readonly parentOrigin: string
	private readonly subscribeToMessages: SubscribeToOverlayMessages

	constructor({
		parentOrigin,
		subscribeToMessages,
	}: {
		parentOrigin: string
		subscribeToMessages: SubscribeToOverlayMessages
	}) {
		this.parentOrigin = parentOrigin
		this.subscribeToMessages = subscribeToMessages
		this.setup()
	}

	private setup() {
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
		appendCSS(root, overlayStyles)
		render(
			<Overlay parentOrigin={this.parentOrigin} subscribeToMessages={this.subscribeToMessages} />,
			root,
		)
	}
}

if (window.prismic) {
	window.prismic.EmbeddedPreviewOverlay = EmbeddedPreviewOverlay
}
