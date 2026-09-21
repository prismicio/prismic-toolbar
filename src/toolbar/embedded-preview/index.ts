import { once, readyDOM } from "@common"

import { isAckMessage, isSetRefMessage, readyMessage } from "./message-protocol"
import type { MessageHandler, PostMessage } from "./message-protocol"
import { EmbeddedPreviewOverlay } from "./overlay"

export interface EmbeddedPreviewOptions {
	onRef?: (ref: string) => Promise<void>
}

export async function setupEmbeddedPreview({ onRef }: EmbeddedPreviewOptions = {}) {
	await readyDOM()

	const subscribers = new Set<MessageHandler>()

	function subscribeToMessages(handler: MessageHandler) {
		subscribers.add(handler)
		return () => {
			subscribers.delete(handler)
		}
	}

	if (onRef) {
		subscribeToMessages(({ data }) => {
			if (!isSetRefMessage(data)) return

			onRef(data.token).catch((error) => {
				console.error("Failed to update embedded preview ref.", error)
			})
		})
	}

	const connect = once((event: MessageEvent<unknown>) => {
		const postMessage: PostMessage = (message) => window.parent.postMessage(message, event.origin)

		new EmbeddedPreviewOverlay({
			postMessage,
			subscribeToMessages,
		})
	})

	subscribeToMessages((event) => {
		if (isAckMessage(event.data)) connect(event)
	})

	const handleMessage = (event: MessageEvent<unknown>) => {
		if (!isAllowedParentOrigin(event.origin)) return
		if (event.source !== window.parent) return

		for (const subscriber of subscribers) subscriber(event)
	}

	window.addEventListener("message", handleMessage)

	// Safe to broadcast to '*': no data in this message
	window.parent.postMessage(readyMessage, "*")
}

if (window.prismic) {
	window.prismic.setupEmbeddedPreview = setupEmbeddedPreview
}

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

function isAllowedParentOrigin(origin: string) {
	if (!origin) return false
	return allowedParentOrigins.some((allowedOrigin) => allowedOrigin.test(origin))
}
