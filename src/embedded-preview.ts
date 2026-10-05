import { isAckMessage, isSetRefMessage, readyMessage } from "./embedded-preview/message-protocol"
import type { MessageHandler, PostMessage } from "./embedded-preview/message-protocol"
import { EmbeddedPreviewOverlay } from "./embedded-preview/overlay"
import { registerChunk, type EmbeddedPreviewOptions } from "./lib/chunks"
import { readyDOM } from "./lib/dom"

export type { EmbeddedPreviewOptions }

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

			onRef(data.token, data.reload).catch((error) => {
				console.error("Failed to update embedded preview ref.", error)
			})
		})
	}

	let connected = false
	subscribeToMessages((event) => {
		if (connected || !isAckMessage(event.data)) return

		connected = true
		const postMessage: PostMessage = (message) => window.parent.postMessage(message, event.origin)
		new EmbeddedPreviewOverlay({ postMessage, subscribeToMessages })
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

registerChunk("setupEmbeddedPreview", setupEmbeddedPreview)

const allowedParentOrigins = [
	/^https:\/\/([^/]+\.)?prismic\.io$/,
	/^https:\/\/([^/]+\.)?wroom\.io$/,
	/^https:\/\/([^/]+\.)?dev-tools-wroom\.com$/,
	/^https:\/\/([^/]+\.)?marketing-tools-wroom\.com$/,
	/^https:\/\/([^/]+\.)?platform-wroom\.com$/,
	/^https:\/\/([^/]+\.)?devops-wroom\.com$/,
	/^https:\/\/[a-z0-9-]+-prismic\.vercel\.app$/,
	// A local editor only drives development builds.
	...(__TOOLBAR_LOCAL_EDITOR__ ? [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] : []),
]

function isAllowedParentOrigin(origin: string) {
	if (!origin) return false
	return allowedParentOrigins.some((allowedOrigin) => allowedOrigin.test(origin))
}
