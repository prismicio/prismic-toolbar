import { loadScript } from "./dom"
import type { PreviewSession } from "./preview-session"

export interface MountToolbarOptions {
	session: PreviewSession
	repositoryHost: string
}

export interface EmbeddedPreviewOptions {
	/** Receives refs the editor pushes, with `reload: false` when it expects an in-place update. */
	onRef?: (ref: string, reload?: boolean) => Promise<void>
}

/** Entry points of the lazily loaded bundles. */
export interface ToolbarChunks {
	mountToolbar: (options: MountToolbarOptions) => void
	setupEmbeddedPreview: (options?: EmbeddedPreviewOptions) => Promise<void>
}

declare global {
	interface Window {
		/** Private registry the toolbar's bundles use to reach each other. */
		__prismicToolbar?: Partial<ToolbarChunks>
	}
}

/** Called by a lazily loaded bundle to expose its entry point. */
export function registerChunk<Name extends keyof ToolbarChunks>(
	name: Name,
	entry: ToolbarChunks[Name],
): void {
	window.__prismicToolbar ??= {}
	window.__prismicToolbar[name] = entry
}

/** Loads a bundle and returns the entry point it registers. */
export async function loadChunk<Name extends keyof ToolbarChunks>(
	url: string,
	name: Name,
): Promise<ToolbarChunks[Name]> {
	await loadScript(url)
	const entry = window.__prismicToolbar?.[name]
	if (!entry) throw new Error(`${url} did not register ${name}.`)

	return entry as ToolbarChunks[Name]
}
