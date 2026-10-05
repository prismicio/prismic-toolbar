import type { Bridge } from "./bridge"
import { createCookieWatcher } from "./cookie-watcher"
import { navigationStart as defaultNavigationStart, warn } from "./env"
import { dispatchPreviewEvent, previewEvents } from "./events"
import { liveOwner, releaseOwnership } from "./owner-marker"
import {
	createSiteCookieStore,
	previewCookieName,
	refFor,
	type SiteCookieCodec,
	type SiteCookieStore,
} from "./site-cookie"

export type PreviewStatus = "booting" | "idle" | "polling" | "reloading"

export interface PreviewSnapshot {
	status: PreviewStatus
	authenticated: boolean
	/** Set while this page follows an active preview session. */
	preview?: { ref: string; title: string }
}

export interface PreviewSession {
	start(): Promise<void>
	/** Ends the preview session for this browser. */
	exit(): Promise<void>
	share(pageURL?: string): Promise<string>
	getSnapshot(): PreviewSnapshot
	subscribe(listener: (snapshot: PreviewSnapshot) => void): () => void
	dispose(): void
}

export interface PreviewSessionOptions {
	repositoryHost: string
	/** `json` on websites, `plain` inside the editor. */
	codec: SiteCookieCodec
	/** Follows preview cookie changes made outside this page, such as editor pushes. */
	watchCookie: boolean
	connect(): Promise<Bridge>
	pollInterval?: number
	reload?: () => void
	navigationStart?: () => number
	store?: SiteCookieStore
}

/**
 * Keeps the website's preview cookie in sync with the repository's preview session and tells the
 * website when the ref it renders is stale. Every notification goes through `reconcile`, which
 * compares the cookie with the ref this page renders, so polling, cookie changes and this page's
 * own writes notify at most once per ref.
 */
export function createPreviewSession({
	repositoryHost,
	codec,
	watchCookie,
	connect,
	pollInterval = 3000,
	reload = () => window.location.reload(),
	navigationStart = defaultNavigationStart,
	store = createSiteCookieStore(repositoryHost),
}: PreviewSessionOptions): PreviewSession {
	const listeners = new Set<(snapshot: PreviewSnapshot) => void>()
	let snapshot: PreviewSnapshot = { status: "booting", authenticated: false }
	let bridge: Bridge | undefined
	let serverRef: string | undefined
	let pollTimer: ReturnType<typeof setInterval> | undefined
	let pinging = false

	// Read before anything can change the cookie: the closest guess of what the server rendered.
	const initialRef = currentRef()
	let renderedRef = initialRef

	const watcher = watchCookie
		? createCookieWatcher({
				name: previewCookieName,
				onChange: () => reconcile(previewEvents.update),
			})
		: undefined
	// Watch before connecting so a change during startup is not mistaken for the rendered ref.
	watcher?.start()

	function currentRef() {
		return refFor(store.read(), repositoryHost)
	}

	function setSnapshot(patch: Partial<PreviewSnapshot>) {
		snapshot = { ...snapshot, ...patch }
		for (const listener of listeners) listener(snapshot)
	}

	function reloadPage() {
		stopPolling()
		watcher?.stop()
		setSnapshot({ status: "reloading" })
		reload()
	}

	/** Notifies the website when the cookie's ref differs from the one it renders. */
	function reconcile(event: typeof previewEvents.start | typeof previewEvents.update) {
		if (snapshot.status === "reloading") return

		const ref = currentRef()
		if (ref === renderedRef) return

		renderedRef = ref
		const unhandled =
			ref === undefined
				? dispatchPreviewEvent(previewEvents.end)
				: dispatchPreviewEvent(event, { ref })
		if (unhandled) reloadPage()
	}

	/**
	 * An editor push that landed after this page started loading cannot be in its server-rendered
	 * HTML. Pushes that landed before are, so this cannot loop on reload.
	 */
	function reconcileEditorPush() {
		if (!watchCookie || renderedRef !== initialRef) return

		const owner = liveOwner(store.read())
		if (owner?.repository !== repositoryHost || owner.at <= navigationStart()) return

		renderedRef = undefined
		reconcile(previewEvents.update)
	}

	function writeRef(ref: string) {
		const written = store.writeRef(ref, { codec, authenticated: snapshot.authenticated })
		if (!written) warn("The browser rejected the preview cookie. Check that cookies are allowed.")
		return written
	}

	function startPolling(preview: { ref: string; title: string }) {
		setSnapshot({ status: "polling", preview })
		pollTimer ??= setInterval(() => {
			if (document.visibilityState === "visible") void tick()
		}, pollInterval)
		document.addEventListener("visibilitychange", handleVisibilityChange)
	}

	function stopPolling() {
		if (pollTimer) clearInterval(pollTimer)
		pollTimer = undefined
		document.removeEventListener("visibilitychange", handleVisibilityChange)
	}

	function handleVisibilityChange() {
		if (document.visibilityState !== "visible") return
		watcher?.check()
		void tick()
	}

	async function tick() {
		if (!bridge || snapshot.status !== "polling" || pinging || serverRef === undefined) return

		pinging = true
		let nextRef: string | null
		try {
			nextRef = (await bridge.ping(serverRef)).ref
		} catch {
			return // Transient failure: try again on the next tick.
		} finally {
			pinging = false
		}
		if (snapshot.status !== "polling" || nextRef === serverRef) return

		const cookie = store.read()
		const editorOwnsCookie = Boolean(liveOwner(cookie))

		if (nextRef === null) {
			// The session ended. Clear the cookie only when it still holds this session's ref.
			const ownsCookie = !editorOwnsCookie && refFor(cookie, repositoryHost) === serverRef
			stopPolling()
			void bridge.closeSession().catch(() => {})
			serverRef = undefined
			setSnapshot({ status: "idle", preview: undefined })
			if (ownsCookie) {
				store.removeOwn()
				reconcile(previewEvents.update)
			}
			return
		}

		serverRef = nextRef
		if (snapshot.preview) setSnapshot({ preview: { ...snapshot.preview, ref: nextRef } })
		// Never overwrite a ref the editor pushed. An unchanged ref above never writes either, which
		// keeps this tab from fighting the editor over the cookie.
		if (editorOwnsCookie) return

		if (refFor(cookie, repositoryHost) !== nextRef && !writeRef(nextRef)) return
		reconcile(previewEvents.update)
	}

	return {
		async start() {
			try {
				bridge = await connect()
				const state = await bridge.getState()
				setSnapshot({ authenticated: state.isAuthenticated })

				if (!state.preview) {
					// Clear a stale repository session, but leave the website's cookie: another tab or the
					// editor may own it.
					void bridge.closeSession().catch(() => {})
					setSnapshot({ status: "idle" })
					reconcileEditorPush()
					return
				}

				serverRef = state.preview.ref
				const cookie = store.read()
				const cookieRef = refFor(cookie, repositoryHost)

				if (liveOwner(cookie)) {
					reconcileEditorPush()
				} else if (cookieRef !== serverRef) {
					if (!writeRef(serverRef)) {
						setSnapshot({ status: "idle" })
						return
					}
					renderedRef = serverRef
					if (dispatchPreviewEvent(previewEvents.start, { ref: serverRef })) {
						reloadPage()
						return
					}
				} else if (cookie.kind === "plain" && codec === "json") {
					// SDK preview routes store the raw ref, which already renders the session.
					writeRef(serverRef)
				}

				startPolling(state.preview)
			} catch (error) {
				warn(`Could not reach the preview session.\n\n${String(error)}`)
				setSnapshot({ status: "idle" })
			}
		},

		async exit() {
			stopPolling()
			await bridge?.closeSession().catch(() => {})
			serverRef = undefined

			const owner = liveOwner(store.read())
			if (!owner) {
				store.removeOwn()
			} else if (owner.repository === repositoryHost) {
				releaseOwnership()
				store.deleteAll()
			} // Otherwise another repository's editor owns the cookie: leave it.

			renderedRef = currentRef()
			setSnapshot({ status: "idle", preview: undefined })
			if (dispatchPreviewEvent(previewEvents.end)) reloadPage()
		},

		async share(pageURL = window.location.href) {
			if (!bridge) throw new Error("The preview session is not connected.")
			return bridge.share(pageURL)
		},

		getSnapshot: () => snapshot,

		subscribe(listener) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},

		dispose() {
			stopPolling()
			watcher?.stop()
			bridge?.dispose()
			listeners.clear()
		},
	}
}
