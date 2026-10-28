import { registerChunk } from "./lib/chunks"
import { deleteCookie, getCookie, setCookie } from "./lib/cookie"
import { repositoryOrigin, warn } from "./lib/env"
import { dispatchPreviewEvent } from "./lib/events"
import { liveOwner, releaseOwnership } from "./lib/owner-marker"
import type { PreviewSession, PreviewSnapshot } from "./lib/preview-session"
import { parseSiteCookie, previewCookieName, sessionCookieName } from "./lib/site-cookie"
import { mountToolbar } from "./toolbar"

/**
 * Follows the preview session the website's SDK stored in a first-party cookie, with Prismic's
 * public `ping` endpoint. No iframe and no third-party cookies.
 */
export function startV5(repositoryHost: string): void {
	const session = createSession(repositoryHost)
	void session.start()
	// Bundled, so the bar needs no request after this chunk's.
	mountToolbar({ session, repositoryHost })
}

registerChunk("startV5", startV5)

function createSession(repositoryHost: string): PreviewSession {
	const listeners = new Set<(snapshot: PreviewSnapshot) => void>()
	// The ref this page renders. Without one, the first ping gets the session's ref.
	let ref = getCookie(previewCookieName) ?? ""
	let snapshot: PreviewSnapshot = { status: "polling", preview: { ref, title: "" } }
	let timer: ReturnType<typeof setInterval> | undefined
	// The interval and `visibilitychange` must not start a ping while one is in flight.
	let pinging = false

	function setSnapshot(patch: Partial<PreviewSnapshot>) {
		snapshot = { ...snapshot, ...patch }
		for (const listener of listeners) listener(snapshot)
	}

	const editorOwner = () => liveOwner(parseSiteCookie(getCookie(previewCookieName)))

	function stop() {
		clearInterval(timer)
		document.removeEventListener("visibilitychange", tick)
	}

	function end() {
		stop()
		if (editorOwner()?.repository === repositoryHost) releaseOwnership()
		deleteCookie(previewCookieName)
		deleteCookie(sessionCookieName)
		setSnapshot({ status: "idle", preview: undefined })
		if (dispatchPreviewEvent("prismicPreviewEnd")) window.location.reload()
	}

	async function tick() {
		if (pinging || snapshot.status !== "polling" || document.visibilityState !== "visible") return
		// Read on every tick: another tab may have exited or replaced the session.
		const id = getCookie(sessionCookieName)
		if (!id) return end()

		let data: { ref?: string; title?: string; close?: boolean }
		pinging = true
		try {
			const url = `${repositoryOrigin(repositoryHost)}/previews/${id}/ping?ref=${encodeURIComponent(ref)}`
			const response = await fetch(url)
			if (!response.ok) return
			data = await response.json()
		} catch {
			return // Transient failure: try again on the next tick.
		} finally {
			pinging = false
		}
		// The page may have exited or reloaded, or another tab replaced the session, during the ping.
		if (snapshot.status !== "polling" || getCookie(sessionCookieName) !== id) return
		if (data.close) return end()

		const previous = ref
		// While the editor pushes refs, in a preview of this website, they come before the session's.
		const pushed = editorOwner()?.ref
		ref = pushed || data.ref || ref
		setSnapshot({ preview: { ref, title: data.title || "" } })
		if (ref === previous) return

		// Reloading with the old cookie would find the new ref again, and loop.
		if (!pushed && !setCookie(previewCookieName, ref)) {
			return warn("The browser rejected the preview cookie. Check that cookies are allowed.")
		}
		// Without a previous ref, the page does not show the session yet.
		if (dispatchPreviewEvent(previous ? "prismicPreviewUpdate" : "prismicPreviewStart", ref)) {
			stop()
			setSnapshot({ status: "reloading" })
			window.location.reload()
		}
	}

	return {
		async start() {
			timer = setInterval(tick, 3000)
			// A tab coming back into view catches up right away.
			document.addEventListener("visibilitychange", tick)
			await tick()
		},
		async exit() {
			end()
		},
		share() {
			const session = getCookie(sessionCookieName)
			if (!session) throw new Error("The preview session ended.")
			const { pathname, search, hash } = window.location
			const path = encodeURIComponent(pathname + search + hash)
			return `${repositoryOrigin(repositoryHost)}/previews/share/${encodeURIComponent(session)}?path=${path}`
		},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
		dispose() {
			stop()
			listeners.clear()
		},
	}
}
