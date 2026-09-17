import { deleteCookie, getCookie, once, readyDOM, script, setCookie } from "@common"

import { startDocumentHeightReporting } from "./document-height"
import type { SubscribeToOverlayMessages } from "./overlay-messages"

const pushMarkerWindowName = "prismic:embedded-preview"
const pollMarkerWindowName = "prismic:embedded-preview:poll"
const previewCookieName = "io.prismic.preview"

const setRefMessageType = "prismic:embedded-preview:set-ref"
const readyMessageType = "prismic:embedded-preview:ready"
const ackMessageType = "prismic:embedded-preview:ack"

const allowedParentOrigins = [
	/^https:\/\/([^/]+\.)?prismic\.io$/,
	/^https:\/\/([^/]+\.)?wroom\.io$/,
	/^https:\/\/([^/]+\.)?dev-tools-wroom\.com$/,
	/^https:\/\/([^/]+\.)?marketing-tools-wroom\.com$/,
	/^https:\/\/([^/]+\.)?platform-wroom\.com$/,
	/^https:\/\/([^/]+\.)?devops-wroom\.com$/,
	/^https:\/\/[a-z0-9-]+-prismic\.vercel\.app$/,
	/^http:\/\/localhost:\d+$/,
	/^http:\/\/127\.0\.0\.1:\d+$/,
]

export function getEmbeddedPreviewMode() {
	if (window.self === window.top) return
	if (window.name === pushMarkerWindowName) return "push"
	if (window.name === pollMarkerWindowName) return "poll"
}

export class EmbeddedPreviewCookie {
	// Align the site cookie with `ref`. Returns true when the page should reload.
	sync(ref: string | undefined) {
		if (ref === this.getRefForDomain()) return false

		if (ref) this.upsertPreviewForDomain(ref)
		else this.deletePreviewForDomain()

		return true
	}

	getRefForDomain() {
		return getCookie(previewCookieName)
	}

	upsertPreviewForDomain(ref: string) {
		setCookie(previewCookieName, ref)
	}

	deletePreviewForDomain() {
		deleteCookie(previewCookieName)
	}
}

export function setupEmbeddedPreviewPush({
	preview,
	overlayURL,
}: {
	preview: { updateFromRef(ref: string): Promise<void> }
	overlayURL: string
}) {
	void connectToParent({
		overlayURL,
		handleMessage: (event) => {
			if (!isSetRefMessage(event.data)) return

			preview.updateFromRef(event.data.token).catch((error) => {
				console.error("Failed to update embedded preview ref.", error)
			})
		},
	})
}

export function setupEmbeddedPreviewPoll({ overlayURL }: { overlayURL: string }) {
	void connectToParent({ overlayURL })
}

async function connectToParent({
	overlayURL,
	handleMessage = () => {},
}: {
	overlayURL: string
	handleMessage?: (event: MessageEvent<unknown>) => void
}) {
	try {
		await Promise.all([script(overlayURL), readyDOM()])
	} catch (error) {
		console.error("Failed to load embedded preview overlay.", error)
		return
	}

	const EmbeddedPreviewOverlay = window.prismic?.EmbeddedPreviewOverlay
	if (!EmbeddedPreviewOverlay) {
		console.error("Failed to load embedded preview overlay.")
		return
	}

	let handleOverlayMessage: ((data: unknown) => void) | undefined
	const subscribeToMessages: SubscribeToOverlayMessages = (nextHandleMessage) => {
		handleOverlayMessage = nextHandleMessage
		return () => {
			if (handleOverlayMessage === nextHandleMessage) handleOverlayMessage = undefined
		}
	}
	const connect = once((parentOrigin: string) => {
		startDocumentHeightReporting({ parentOrigin })
		new EmbeddedPreviewOverlay({
			parentOrigin,
			subscribeToMessages,
		})
	})

	window.addEventListener("message", (event: MessageEvent<unknown>) => {
		if (!isAllowedParentOrigin(event.origin)) return
		if (event.source !== window.parent) return

		if (isTypedMessage(event.data, ackMessageType)) {
			connect(event.origin)
			return
		}

		handleOverlayMessage?.(event.data)
		handleMessage(event)
	})

	// Safe to broadcast to '*': no data in this message, and both sides
	// validate origins on the messages that follow.
	window.parent.postMessage({ type: readyMessageType }, "*")
}

function isSetRefMessage(data: unknown): data is { type: typeof setRefMessageType; token: string } {
	return (
		isTypedMessage(data, setRefMessageType) &&
		typeof data.token === "string" &&
		data.token.length > 0
	)
}

function isTypedMessage(data: unknown, type: string): data is Record<string, unknown> {
	return data !== null && typeof data === "object" && "type" in data && data.type === type
}

function isAllowedParentOrigin(origin: string) {
	if (!origin) return false
	return allowedParentOrigins.some((allowedOrigin) => allowedOrigin.test(origin))
}
