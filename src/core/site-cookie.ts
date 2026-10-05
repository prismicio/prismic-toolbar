import { deleteCookie, getCookie, setCookie } from "./cookie"

/**
 * The website's preview cookie. `@prismicio/client` sends its whole value as the Content API ref,
 * and the framework SDKs read it to detect an active preview.
 */
export const previewCookieName = "io.prismic.preview"

/**
 * - `plain`: a raw ref, written by SDK preview routes and by the toolbar inside the editor.
 * - `json`: `{ "_tracker": "…", "<repository host>": { "preview": "<ref>" } }`, written by the
 *   toolbar on the website itself.
 */
export type SiteCookie =
	| { kind: "none" }
	| { kind: "plain"; raw: string }
	| { kind: "json"; raw: string; tracker?: string; refs: Record<string, string> }

/** `json` cookies carry one ref per repository; `plain` cookies carry a single raw ref. */
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

	let tracker: string | undefined
	const refs: Record<string, string> = {}
	for (const [key, entry] of Object.entries(value)) {
		if (key === "_tracker") {
			if (typeof entry === "string") tracker = entry
		} else if (isPreviewEntry(entry)) {
			refs[key] = entry.preview
		}
	}

	return { kind: "json", raw, tracker, refs }
}

/** The ref a repository's preview uses, if the cookie holds one. */
export function refFor(cookie: SiteCookie, repositoryHost: string): string | undefined {
	if (cookie.kind === "plain") return cookie.raw
	if (cookie.kind === "json") return cookie.refs[repositoryHost]
}

/** Serializes a `json` cookie, with `_tracker` first, or returns `undefined` when it holds no ref. */
export function serializeSiteCookie({
	tracker,
	refs,
}: {
	tracker?: string
	refs: Record<string, string>
}): string | undefined {
	const entries = Object.entries(refs)
	if (!entries.length) return undefined

	const value: Record<string, unknown> = {}
	if (tracker) value._tracker = tracker
	for (const [repositoryHost, preview] of entries) value[repositoryHost] = { preview }

	return JSON.stringify(value)
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
	const read = () => parseSiteCookie(getCookie(previewCookieName))

	return {
		read,

		writeRef(ref, { codec, authenticated }) {
			if (codec === "plain") return setCookie(previewCookieName, ref)

			const current = read()
			const refs = current.kind === "json" ? { ...current.refs } : {}
			refs[repositoryHost] = ref
			const tracker = authenticated ? generateTracker() : undefined

			return setCookie(previewCookieName, serializeSiteCookie({ tracker, refs }) as string)
		},

		removeOwn() {
			const current = read()
			if (current.kind !== "json") return deleteCookie(previewCookieName)

			const refs = { ...current.refs }
			delete refs[repositoryHost]
			const value = serializeSiteCookie({ tracker: current.tracker, refs })
			if (value) setCookie(previewCookieName, value)
			else deleteCookie(previewCookieName)
		},

		deleteAll() {
			deleteCookie(previewCookieName)
		},
	}
}

function isPreviewEntry(entry: unknown): entry is { preview: string } {
	return (
		Boolean(entry) &&
		typeof entry === "object" &&
		typeof (entry as { preview?: unknown }).preview === "string"
	)
}

const trackerAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

function generateTracker(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(8))
	return Array.from(bytes, (byte) => trackerAlphabet[byte % trackerAlphabet.length]).join("")
}
