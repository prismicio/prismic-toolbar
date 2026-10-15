import { h, render } from "preact"

import { registerChunk, type MountToolbarOptions } from "./lib/chunks"
import { appendCSS, shadow } from "./lib/dom"
import { PreviewBar } from "./toolbar/PreviewBar"

import styles from "./toolbar/bar.css?inline"

/** Renders the preview bar in its own shadow root, isolated from the website's styles. */
export function mountToolbar(options: MountToolbarOptions): void {
	const root = shadow({
		id: "prismic-toolbar",
		style: { position: "fixed", zIndex: 2147483647, bottom: 0, left: 0 },
	})
	appendCSS(root, styles)
	render(h(PreviewBar, options), root)
}

registerChunk("mountToolbar", mountToolbar)
