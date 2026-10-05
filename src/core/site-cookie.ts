import Cookies from "js-cookie"

import { deleteCookie, setCookie } from "./cookie"

/** `@prismicio/client` sends this cookie's whole value as the Content API ref. */
export const previewCookieName = "io.prismic.preview"

/**
 * - `plain`: a raw ref, written by SDK preview routes and by the toolbar inside the editor.
 * - `json`: `{ "_tracker": "…", "<repository host>": { "preview": "<ref>" } }`, written by the
 *   toolbar on websites.
 */
export type SiteCookie =
	| { kind: "none" }
	| { kind: "plain"; raw: string }
	| { kind: "json"; raw: string; tracker?: string; refs: Record<string, string> }

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

	const { _tracker, ...entries } = value as Record<string, unknown>
	const refs: Record<string, string> = {}
	for (const [repositoryHost, entry] of Object.entries(entries)) {
		const preview = (entry as { preview?: unknown } | null)?.preview
		if (typeof preview === "string") refs[repositoryHost] = preview
	}

	return { kind: "json", raw, tracker: typeof _tracker === "string" ? _tracker : undefined, refs }
}

export function refFor(cookie: SiteCookie, repositoryHost: string): string | undefined {
	if (cookie.kind === "plain") return cookie.raw
	if (cookie.kind === "json") return cookie.refs[repositoryHost]
}

export interface SiteCookieStore {
	read(): SiteCookie
	/**
	 * Stores this repository's ref and reports whether the browser kept it. `json` writes keep other
	 * repositories' refs and give authenticated users a new tracker, which makes the cookie, and so
	 * the Content API ref, unique.
	 */
	writeRef(ref: string, options: { codec: SiteCookieCodec; authenticated: boolean }): boolean
	/** Removes this repository's ref, deleting the cookie when no other ref remains. */
	removeOwn(): void
	deleteAll(): void
}

export function createSiteCookieStore(repositoryHost: string): SiteCookieStore {
	const read = () => parseSiteCookie(Cookies.get(previewCookieName))

	function writeJSON(tracker: string | undefined, refs: Record<string, string>) {
		const entries = Object.entries(refs).map(([host, preview]) => [host, { preview }])
		if (!entries.length) {
			deleteCookie(previewCookieName)
			return true
		}
		// Older SDKs find the repository with a regex that expects `_tracker` first.
		const value = Object.fromEntries(tracker ? [["_tracker", tracker], ...entries] : entries)
		return setCookie(previewCookieName, JSON.stringify(value))
	}

	return {
		read,

		writeRef(ref, { codec, authenticated }) {
			if (codec === "plain") return setCookie(previewCookieName, ref)

			const current = read()
			const refs = { ...(current.kind === "json" ? current.refs : {}), [repositoryHost]: ref }
			return writeJSON(authenticated ? generateTracker() : undefined, refs)
		},

		removeOwn() {
			const current = read()
			if (current.kind !== "json") return deleteCookie(previewCookieName)

			const { [repositoryHost]: _removed, ...refs } = current.refs
			writeJSON(current.tracker, refs)
		},

		deleteAll() {
			deleteCookie(previewCookieName)
		},
	}
}

const trackerAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

function generateTracker(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(8))
	return Array.from(bytes, (byte) => trackerAlphabet[byte % trackerAlphabet.length]).join("")
}
