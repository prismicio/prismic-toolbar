import { warn } from "./env"
import { dispatchPreviewEvent } from "./events"
import { createSiteCookieStore, refFor, type SiteCookieStore } from "./site-cookie"

/**
 * Handles refs the editor pushes into its preview iframe.
 *
 * - `reload: false`: the editor keeps the preview mounted and expects the website to update in place.
 *   The toolbar stores the ref and notifies the website, but never reloads.
 * - No flag: older editors. The toolbar stores the ref and reloads unless the website handles it.
 */
export function createEmbeddedPush({
	repositoryHost,
	reload = () => window.location.reload(),
	store = createSiteCookieStore(repositoryHost),
}: {
	repositoryHost: string
	reload?: () => void
	store?: SiteCookieStore
}): (token: string, reloadPage?: boolean) => Promise<void> {
	let lastToken: string | undefined

	return async (token, reloadPage) => {
		const cookieRef = refFor(store.read(), repositoryHost)

		if (reloadPage === false) {
			// The first push notifies even when the cookie already holds the ref: the editor may have
			// computed it after the page rendered.
			if (token === lastToken && token === cookieRef) return
			lastToken = token
			if (token !== cookieRef && !writeRef(store, token)) return
			dispatchPreviewEvent("prismicPreviewUpdate", token)
			return
		}

		lastToken = token
		if (token === cookieRef) return
		if (!writeRef(store, token)) return
		if (dispatchPreviewEvent("prismicPreviewUpdate", token)) reload()
	}
}

function writeRef(store: SiteCookieStore, ref: string) {
	const written = store.writeRef(ref, "plain")
	// Reloading would not help: the next load would find the same stale cookie.
	if (!written) warn("The browser rejected the preview cookie. Check that cookies are allowed.")
	return written
}
