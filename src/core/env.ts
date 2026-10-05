/**
 * - `regular`: the website at the top level.
 * - `embedded-push`: the editor's preview iframe; the editor pushes refs.
 * - `embedded-poll`: the editor's preview iframe; the toolbar polls the preview session.
 */
export type ToolbarMode = "regular" | "embedded-push" | "embedded-poll"

/** The toolbar runs at the top level or inside the editor's preview iframe, never elsewhere. */
export function detectMode(win: Window = window): ToolbarMode | undefined {
	if (win.self === win.top) return "regular"
	if (win.name === "prismic:embedded-preview") return "embedded-push"
	if (win.name === "prismic:embedded-preview:poll") return "embedded-poll"
}

/**
 * Reads the repository from the toolbar script's `repo` parameter. Call it while that script first
 * runs: `document.currentScript` is only set then.
 */
export function findRepositoryHost(doc: Document = document): string | undefined {
	const scripts = doc.querySelectorAll<HTMLScriptElement>(
		'script[src*="prismic.js"], script[src*="prismic.min.js"]',
	)
	const script =
		doc.currentScript instanceof HTMLScriptElement ? doc.currentScript : scripts[scripts.length - 1]

	return script?.src ? parseRepositoryHost(new URL(script.src).searchParams.get("repo")) : undefined
}

/**
 * Accepts a repository name (`example` → `example.prismic.io`) or host (`example.wroom.io`, with an
 * optional protocol, path, or `.cdn` segment). Only the first of comma-separated values is used.
 */
export function parseRepositoryHost(input: string | null): string | undefined {
	const first = input?.split(",")[0]?.trim().toLowerCase()
	if (!first) return undefined

	let host = first.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
	if (!host.includes(".")) host = `${host}.prismic.io`
	host = host.replace(".cdn.", ".")

	return /^[a-z0-9_-]+(\.[a-z0-9_-]+)+(:\d+)?$/.test(host) ? host : undefined
}

/** Repositories on `.test` hosts are local Prismic instances that follow the page's protocol. */
export function repositoryOrigin(repositoryHost: string, location: Location = window.location) {
	const isLocal = repositoryHost.replace(/:\d+$/, "").endsWith(".test")
	return `${isLocal ? location.protocol : "https:"}//${repositoryHost}`
}

export function warn(message: string): void {
	console.warn(`Prismic Toolbar\n\n${message}`)
}
