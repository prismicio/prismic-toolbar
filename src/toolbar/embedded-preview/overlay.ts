import { appendCSS, readyDOM, shadow } from "@common"
import { h, render } from "preact"

import { Overlay } from "./components/Overlay"
import {
	isCommentOverlayMessage,
	isOverlayScaleMessage,
	isScrollToPinMessage,
} from "./overlay-messages"
import type { CommentOverlayState, OverlayEvent } from "./overlay-messages"

import overlayStyles from "./overlay.css?inline"

const emptyCommentState: CommentOverlayState = {
	placementEnabled: false,
	pins: [],
}

export class EmbeddedPreviewOverlay {
	private readonly parentOrigin: string
	private uiScale = 1
	private commentState = emptyCommentState
	private scrollToPinRequest: { id: number; threadId: string } | undefined
	private root: ShadowRoot | HTMLDivElement | undefined

	constructor({ parentOrigin }: { parentOrigin: string }) {
		this.parentOrigin = parentOrigin
		this.setup()
	}

	handleMessage(data: unknown) {
		if (isOverlayScaleMessage(data)) {
			this.uiScale = data.uiScale
		} else if (isCommentOverlayMessage(data)) {
			this.commentState = data
		} else if (isScrollToPinMessage(data)) {
			this.scrollToPinRequest = {
				id: (this.scrollToPinRequest?.id ?? 0) + 1,
				threadId: data.threadId,
			}
		} else {
			return
		}

		this.render()
	}

	private async setup() {
		await readyDOM()
		this.root = shadow({
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
		appendCSS(this.root, overlayStyles)
		this.render()
	}

	private render() {
		if (!this.root) return

		render(
			h(Overlay, {
				uiScale: this.uiScale,
				commentState: this.commentState,
				scrollToPinRequest: this.scrollToPinRequest,
				onEvent: this.post,
			}),
			this.root,
		)
	}

	private post = (event: OverlayEvent) => {
		window.parent.postMessage(event, this.parentOrigin)
	}
}

if (window.prismic) {
	window.prismic.EmbeddedPreviewOverlay = EmbeddedPreviewOverlay
}
