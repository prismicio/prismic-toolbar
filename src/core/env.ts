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

/** Must run synchronously while the toolbar script executes, before `currentScript` resets. */
export function findToolbarScript(doc: Document = document): HTMLScriptElement | undefined {
	if (doc.currentScript instanceof HTMLScriptElement) return doc.currentScript

	const scripts = doc.querySelectorAll<HTMLScriptElement>(
		'script[src*="prismic.js"], script[src*="prismic.min.js"]',
	)
	return scripts[scripts.length - 1]
}

/** Reads the repository from the `repo` query parameter of the toolbar script. */
export function repositoryHostFromScript(
	script: HTMLScriptElement | undefined,
): string | undefined {
	if (!script?.src) return undefined

	try {
		return parseRepositoryHost(new URL(script.src, window.location.href).searchParams.get("repo"))
	} catch {
		return undefined
	}
}

/**
 * Accepts a repository name (`example` → `example.prismic.io`) or host (`example.wroom.io`, with an
 * optional protocol, path, or `.cdn` segment). Only the first of comma-separated values is used.
 */
export function parseRepositoryHost(input: string | null | undefined): string | undefined {
	const first = input?.split(",")[0]?.trim().toLowerCase()
	if (!first) return undefined

	let host = first.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
	if (!host.includes(".")) host = `${host}.prismic.io`
	host = host.replace(".cdn.", ".")

	return /^[a-z0-9_-]+(\.[a-z0-9_-]+)+(:\d+)?$/.test(host) ? host : undefined
}

/** Repositories on `.test` hosts are local Prismic instances that follow the page's protocol. */
export function repositoryOrigin(repositoryHost: string, location: Location = window.location) {
	const hostname = repositoryHost.replace(/:\d+$/, "")
	const protocol = hostname.endsWith(".test") ? location.protocol : "https:"

	return `${protocol}//${repositoryHost}`
}

/** When this page's navigation started, comparable with `Date.now()`. */
export function navigationStart(): number {
	return typeof performance !== "undefined" && performance.timeOrigin
		? performance.timeOrigin
		: Date.now()
}

export function warn(message: string): void {
	console.warn(`Prismic Toolbar\n\n${message}`)
}
