import { warn } from "./env"
import { dispatchPreviewEvent } from "./events"
import { claimOwnership, releaseOwnership } from "./owner-marker"
import { createSiteCookieStore, refFor, type SiteCookieStore } from "./site-cookie"

/**
 * Handles refs the editor pushes into its preview iframe.
 *
 * - `reload: false`: the editor keeps the preview mounted and expects the website to update in place.
 *   The toolbar stores the ref, marks it as the editor's, and notifies the website, but never
 *   reloads. Website tabs leave a marked ref alone.
 * - No flag: older editors. The toolbar stores the ref and reloads unless the website handles it.
 */
export function createEmbeddedPush({
	repositoryHost,
	reload = () => window.location.reload(),
	now = Date.now,
	store = createSiteCookieStore(repositoryHost),
}: {
	repositoryHost: string
	reload?: () => void
	now?: () => number
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

			// Claim before writing, so website tabs see the marker as soon as the ref lands.
			claimOwnership(repositoryHost, token, now())
			if (token !== cookieRef && !writeRef(store, token)) return
			dispatchPreviewEvent("prismicPreviewUpdate", token)
			return
		}

		lastToken = token
		if (token === cookieRef) return

		releaseOwnership()
		if (!writeRef(store, token)) return
		if (dispatchPreviewEvent("prismicPreviewUpdate", token)) reload()
	}
}

function writeRef(store: SiteCookieStore, ref: string) {
	const written = store.writeRef(ref, { codec: "plain", authenticated: false })
	// Reloading would not help: the next load would find the same stale cookie.
	if (!written) warn("The browser rejected the preview cookie. Check that cookies are allowed.")
	return written
}
