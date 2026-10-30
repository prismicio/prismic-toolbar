import { warn, type ToolbarMode } from "./env"

interface ChunkParams {
	repositoryHost: string
	mode: ToolbarMode
}

/**
 * Loads a chunk, which starts itself with `params`. A classic script: the CDN sends no CORS
 * headers, which module scripts would need.
 */
export function loadChunk(url: string, { repositoryHost, mode }: ChunkParams): void {
	const script = document.createElement("script")
	script.src = url
	script.dataset.repositoryHost = repositoryHost
	script.dataset.mode = mode
	script.onerror = () => warn(`Could not load the preview from ${url}.`)
	document.head.appendChild(script)
}

/**
 * Reads the parameters `prismic.js` loaded this chunk with. Call it while the chunk first runs:
 * `document.currentScript` is only set then.
 */
export function readChunkParams(): ChunkParams {
	const { repositoryHost, mode } = (document.currentScript as HTMLScriptElement).dataset
	return { repositoryHost: repositoryHost!, mode: mode as ToolbarMode }
}
