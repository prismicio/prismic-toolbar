import { deleteCookie, getCookie, setCookie } from "./cookie"

/** `@prismicio/client` sends this cookie's whole value as the Content API ref. */
export const previewCookieName = "io.prismic.preview"

/** The preview session ID, written by SDK preview routes for the v5 flow. */
export const sessionCookieName = "io.prismic.previewSession"

/**
 * - `plain`: a raw ref, written by SDK preview routes and by the toolbar inside the editor.
 * - `json`: `{ "<repository host>": { "preview": "<ref>" } }`, written by the toolbar on websites.
 */
export type SiteCookie =
	| { kind: "none" }
	| { kind: "plain"; raw: string }
	| { kind: "json"; raw: string; refs: Record<string, string> }

export type SiteCookieCodec = "json" | "plain"

export function parseSiteCookie(raw: string | undefined): SiteCookie {
	if (!raw) return { kind: "none" }

	let value: unknown
	try {
		value = JSON.parse(raw)
	} catch {
		return { kind: "plain", raw }
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) return { kind: "plain", raw }

	const refs: Record<string, string> = {}
	for (const [repositoryHost, entry] of Object.entries(value)) {
		const preview = (entry as { preview?: unknown } | null)?.preview
		if (typeof preview === "string") refs[repositoryHost] = preview
	}

	return { kind: "json", raw, refs }
}

export function refFor(cookie: SiteCookie, repositoryHost: string): string | undefined {
	if (cookie.kind === "plain") return cookie.raw
	if (cookie.kind === "json") return cookie.refs[repositoryHost]
}

export interface SiteCookieStore {
	read(): SiteCookie
	/**
	 * Stores this repository's ref and reports whether the browser kept it. `json` writes keep other
	 * repositories' refs.
	 */
	writeRef(ref: string, codec: SiteCookieCodec): boolean
	/** Removes this repository's ref, deleting the cookie when no other ref remains. */
	removeOwn(): void
	deleteAll(): void
}

export function createSiteCookieStore(repositoryHost: string): SiteCookieStore {
	const read = () => parseSiteCookie(getCookie(previewCookieName))

	function writeJSON(refs: Record<string, string>) {
		const entries = Object.entries(refs).map(([host, preview]) => [host, { preview }])
		if (!entries.length) {
			deleteCookie(previewCookieName)
			return true
		}
		return setCookie(previewCookieName, JSON.stringify(Object.fromEntries(entries)))
	}

	return {
		read,

		writeRef(ref, codec) {
			if (codec === "plain") return setCookie(previewCookieName, ref)

			const current = read()
			return writeJSON({ ...(current.kind === "json" ? current.refs : {}), [repositoryHost]: ref })
		},

		removeOwn() {
			const current = read()
			if (current.kind !== "json") return deleteCookie(previewCookieName)

			const { [repositoryHost]: _removed, ...refs } = current.refs
			writeJSON(refs)
		},

		deleteAll() {
			deleteCookie(previewCookieName)
		},
	}
}
