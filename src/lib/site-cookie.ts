import { deleteCookie, getCookie, setCookie } from "./cookie"

/** `@prismicio/client` sends this cookie's whole value as the Content API ref. */
export const previewCookieName = "io.prismic.preview"

/** The preview session ID, written by SDK preview routes for the v5 flow. */
export const sessionCookieName = "io.prismic.previewSession"

/**
 * - `plain`: a raw ref, written by SDK preview routes and by the toolbar inside the editor. The
 *   toolbar keeps it raw on websites too.
 * - `json`: `{ "<repository host>": { "preview": "<ref>" } }`, written by the toolbar on websites
 *   when the cookie is empty.
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
	 * Stores this repository's ref, alone in the cookie, and reports whether the browser kept it.
	 * Keeps a raw ref raw: `json` only applies to an empty or JSON cookie.
	 */
	writeRef(ref: string, codec: SiteCookieCodec): boolean
	delete(): void
}

export function createSiteCookieStore(repositoryHost: string): SiteCookieStore {
	const read = () => parseSiteCookie(getCookie(previewCookieName))

	return {
		read,

		writeRef(ref, codec) {
			const plain = codec === "plain" || read().kind === "plain"
			const value = plain ? ref : JSON.stringify({ [repositoryHost]: { preview: ref } })
			return setCookie(previewCookieName, value)
		},

		delete: () => deleteCookie(previewCookieName),
	}
}
