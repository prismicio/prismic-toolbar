import { script } from "@common"

import type { EmbeddedPreviewOptions } from "./index"

export function getEmbeddedPreviewMode() {
	if (window.self === window.top) return
	if (window.name === "prismic:embedded-preview") return "push"
	if (window.name === "prismic:embedded-preview:poll") return "poll"
}

interface LoadEmbeddedPreviewOptions extends EmbeddedPreviewOptions {
	url: string
}

export async function loadEmbeddedPreview({ url, ...options }: LoadEmbeddedPreviewOptions) {
	try {
		await script(url)
		if (!window.prismic?.setupEmbeddedPreview) {
			throw new Error("Embedded preview module did not register its initializer.")
		}
		await window.prismic.setupEmbeddedPreview(options)
	} catch (error) {
		console.error("Failed to load embedded preview.", error)
	}
}
