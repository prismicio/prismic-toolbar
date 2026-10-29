import { deleteCookie, getCookie, setCookie } from "./cookie"
import { warn } from "./env"

/**
 * `@prismicio/client` sends this cookie's whole value as the Content API ref. It holds either:
 *
 * - A raw ref, written by SDK preview routes and by the toolbar inside the editor. The toolbar keeps
 *   it raw on websites too.
 * - `{ "<repository host>": { "preview": "<ref>" } }`, written by the toolbar on websites when the
 *   cookie is empty.
 */
export const previewCookieName = "io.prismic.preview"

/** The preview session ID, written by SDK preview routes for the v5 flow. */
export const sessionCookieName = "io.prismic.previewSession"

export type SiteCookieCodec = "json" | "plain"

type Entries = Record<string, { preview?: unknown } | null>

/** The cookie's JSON entries, or `undefined` when it holds a raw ref. */
function parseEntries(raw: string): Entries | undefined {
	try {
		const value: unknown = JSON.parse(raw)
		if (value && typeof value === "object" && !Array.isArray(value)) return value as Entries
	} catch {}
}

export function readPreviewRef(repositoryHost: string): string | undefined {
	const raw = getCookie(previewCookieName)
	if (!raw) return undefined
	const entries = parseEntries(raw)
	if (!entries) return raw
	const preview = entries[repositoryHost]?.preview
	return typeof preview === "string" ? preview : undefined
}

/**
 * Stores this repository's ref, alone in the cookie, and reports whether the browser kept it. Keeps
 * a raw ref raw: `json` only applies to an empty or JSON cookie.
 */
export function writePreviewRef(repositoryHost: string, ref: string, codec: SiteCookieCodec) {
	const raw = getCookie(previewCookieName)
	const plain = codec === "plain" || Boolean(raw && !parseEntries(raw))
	const value = plain ? ref : JSON.stringify({ [repositoryHost]: { preview: ref } })
	const written = setCookie(previewCookieName, value)
	if (!written) warn("The browser rejected the preview cookie. Check that cookies are allowed.")
	return written
}

export const deletePreviewCookie = () => deleteCookie(previewCookieName)
