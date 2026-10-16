import { registerChunk, type MountToolbarOptions } from "./lib/chunks"
import { appendCSS, shadow } from "./lib/dom"
import { renderPreviewBar } from "./toolbar/preview-bar"

import styles from "./toolbar/bar.css?inline"

/**
 * Renders the preview bar in its own shadow root, isolated from the website's styles. Returns a
 * function that removes the bar and stops following the session.
 */
export function mountToolbar(options: MountToolbarOptions): () => void {
	const root = shadow({
		id: "prismic-toolbar",
		style: { position: "fixed", zIndex: 2147483647, bottom: 0, left: 0 },
	})
	appendCSS(root, styles)
	return renderPreviewBar(root, options)
}

registerChunk("mountToolbar", mountToolbar)
