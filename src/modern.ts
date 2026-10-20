import { loadChunk, registerChunk, type StartModernOptions } from "./lib/chunks"
import { deleteCookie, getCookie, setCookie } from "./lib/cookie"
import { repositoryOrigin, warn } from "./lib/env"
import { dispatchPreviewEvent } from "./lib/events"
import type { PreviewSession, PreviewSnapshot } from "./lib/preview-session"
import { previewCookieName, sessionCookieName } from "./lib/site-cookie"

/**
 * Follows the preview session the website's SDK stored in a first-party cookie, with Prismic's
 * public `ping` endpoint. No iframe and no third-party cookies.
 */
export function startModern({ repositoryHost, assets }: StartModernOptions): void {
	const session = createModernSession(repositoryHost)
	void session.start()
	loadChunk(`${assets}/toolbar.js`, "mountToolbar")
		.then((mountToolbar) => mountToolbar({ session, repositoryHost }))
		.catch((error: unknown) => warn(`Could not load the preview toolbar.\n\n${String(error)}`))
}

registerChunk("startModern", startModern)

function createModernSession(repositoryHost: string): PreviewSession {
	const listeners = new Set<(snapshot: PreviewSnapshot) => void>()
	// The ref this page renders. Without one, the first ping gets the session's ref.
	let ref = getCookie(previewCookieName) ?? ""
	// Not authenticated: the bar hides Share, which modern does not support yet.
	let snapshot: PreviewSnapshot = {
		status: "polling",
		authenticated: false,
		preview: { ref, title: "" },
	}
	let timer: ReturnType<typeof setInterval> | undefined
	// The interval and `visibilitychange` must not start a ping while one is in flight.
	let pinging = false

	function setSnapshot(patch: Partial<PreviewSnapshot>) {
		snapshot = { ...snapshot, ...patch }
		for (const listener of listeners) listener(snapshot)
	}

	function stop() {
		clearInterval(timer)
		document.removeEventListener("visibilitychange", tick)
	}

	function end() {
		stop()
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
		ref = data.ref || ref
		setSnapshot({ preview: { ref, title: data.title || "" } })
		if (ref === previous) return

		// Reloading with the old cookie would find the new ref again, and loop.
		if (!setCookie(previewCookieName, ref)) {
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
		share: () => Promise.reject(new Error("Sharing is not available yet.")),
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
