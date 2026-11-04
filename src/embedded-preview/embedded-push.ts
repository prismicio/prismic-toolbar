import { dispatchPreviewEvent } from "../lib/events"
import { readPreviewRef, writePreviewRef } from "../lib/site-cookie"

/**
 * Handles refs the editor pushes into its preview iframe.
 *
 * - `reload: false`: the editor keeps the preview mounted and expects the website to update in place.
 *   The toolbar stores the ref and notifies the website, but never reloads.
 * - No flag: older editors. The toolbar stores the ref and reloads unless the website handles it.
 */
export function createEmbeddedPush(repositoryHost: string) {
	let lastToken: string | undefined

	return async (token: string, reloadPage?: boolean) => {
		const cookieRef = readPreviewRef(repositoryHost)
		// A rejected cookie returns early: reloading would find the same stale cookie.
		const write = () => writePreviewRef(repositoryHost, token, "plain")

		if (reloadPage === false) {
			// The first push notifies even when the cookie already holds the ref: the editor may have
			// computed it after the page rendered.
			if (token === lastToken && token === cookieRef) return
			lastToken = token
			if (token !== cookieRef && !write()) return
			dispatchPreviewEvent("prismicPreviewUpdate", token)
			return
		}

		lastToken = token
		if (token === cookieRef || !write()) return
		if (dispatchPreviewEvent("prismicPreviewUpdate", token)) window.location.reload()
	}
}
