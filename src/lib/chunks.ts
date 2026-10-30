import { loadScript } from "./dom"
import type { ToolbarMode } from "./env"

/** The bundles `prismic.js` loads, named after their file. Each page loads one at most. */
export type ChunkName = "v4" | "v5" | "embedded-preview"

/** Runs a chunk's scenario. */
export type StartChunk = (repositoryHost: string, mode: ToolbarMode) => void | Promise<void>

declare global {
	interface Window {
		/** Private registry the toolbar's bundles use to reach `prismic.js`. */
		__prismicToolbar?: Partial<Record<ChunkName, StartChunk>>
	}
}

/** Called by a lazily loaded bundle to expose its entry point. */
export function registerChunk(name: ChunkName, start: StartChunk): void {
	window.__prismicToolbar ??= {}
	window.__prismicToolbar[name] = start
}

/** Loads a bundle and returns the entry point it registers. */
export async function loadChunk(url: string, name: ChunkName): Promise<StartChunk> {
	await loadScript(url)
	const start = window.__prismicToolbar?.[name]
	if (!start) throw new Error(`${url} did not register ${name}.`)

	return start
}
