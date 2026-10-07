import type { Bridge } from "./bridge"
import { watchCookie } from "./cookie-watcher"
import { warn } from "./env"
import { dispatchPreviewEvent } from "./events"
import { liveOwner, releaseOwnership } from "./owner-marker"
import {
	createSiteCookieStore,
	previewCookieName,
	refFor,
	type SiteCookie,
	type SiteCookieCodec,
	type SiteCookieStore,
} from "./site-cookie"

export interface PreviewSnapshot {
	status: "booting" | "idle" | "polling" | "reloading"
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
	/**
	 * Follows preview cookie changes made outside this page, such as editor pushes, and leaves refs
	 * the editor pushed alone. Off in the editor, where the preview session sets the ref.
	 */
	watchCookie: boolean
	connect(): Promise<Bridge>
	reload?: () => void
	/** When this page's navigation started, comparable with `Date.now()`. */
	navigationStart?: number
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
	watchCookie: watch,
	connect,
	reload = () => window.location.reload(),
	navigationStart = performance.timeOrigin,
	store = createSiteCookieStore(repositoryHost),
}: PreviewSessionOptions): PreviewSession {
	const listeners = new Set<(snapshot: PreviewSnapshot) => void>()
	let snapshot: PreviewSnapshot = { status: "booting", authenticated: false }
	let bridge: Bridge | undefined
	let serverRef: string | undefined
	let pollTimer: ReturnType<typeof setInterval> | undefined
	let following = false

	const currentRef = () => refFor(store.read(), repositoryHost)
	// Read before anything can change the cookie: the closest guess of what the server rendered.
	const initialRef = currentRef()
	let renderedRef = initialRef
	// Watch before connecting so a change during startup is not mistaken for the rendered ref.
	const unwatch = watch
		? watchCookie(previewCookieName, () => {
				reconcile()
				// A tab that was not previewing follows a session another tab or a share link started.
				if (serverRef === undefined && currentRef() !== undefined) void follow()
			})
		: undefined

	function setSnapshot(patch: Partial<PreviewSnapshot>) {
		snapshot = { ...snapshot, ...patch }
		for (const listener of listeners) listener(snapshot)
	}

	/** Only pages that follow editor pushes leave the editor's ref alone. */
	const editorOwner = (cookie: SiteCookie) => (watch ? liveOwner(cookie) : undefined)

	function startPolling() {
		pollTimer = setInterval(tick, 3000)
		// A tab coming back into view catches up right away.
		document.addEventListener("visibilitychange", tick)
	}

	function stopPolling() {
		clearInterval(pollTimer)
		pollTimer = undefined
		document.removeEventListener("visibilitychange", tick)
	}

	const isReloading = () => snapshot.status === "reloading"

	function reloadPage() {
		stopPolling()
		unwatch?.()
		setSnapshot({ status: "reloading" })
		reload()
	}

	/** Notifies the website when the cookie's ref differs from the one it renders. */
	function reconcile() {
		const ref = currentRef()
		if (isReloading() || ref === renderedRef) return

		const event =
			ref === undefined
				? "prismicPreviewEnd"
				: renderedRef === undefined
					? "prismicPreviewStart"
					: "prismicPreviewUpdate"
		renderedRef = ref
		if (dispatchPreviewEvent(event, ref)) reloadPage()
	}

	/**
	 * An editor push that landed after this page started loading cannot be in its server-rendered
	 * HTML. Pushes that landed before are, so this cannot loop on reload.
	 */
	function reconcileEditorPush() {
		const owner = editorOwner(store.read())
		if (!watch || renderedRef !== initialRef) return
		if (owner?.repository !== repositoryHost || owner.at <= navigationStart) return

		renderedRef = currentRef()
		if (dispatchPreviewEvent("prismicPreviewUpdate", renderedRef)) reloadPage()
	}

	function writeRef(ref: string) {
		const written = store.writeRef(ref, { codec, authenticated: snapshot.authenticated })
		if (!written) warn("The browser rejected the preview cookie. Check that cookies are allowed.")
		return written
	}

	async function tick() {
		if (!bridge || serverRef === undefined || document.visibilityState !== "visible") return

		let nextRef: string | null
		try {
			nextRef = (await bridge.ping(serverRef)).ref
		} catch {
			return // Transient failure: try again on the next tick.
		}
		// Polling may have stopped during the ping, such as on exit or reload.
		if (pollTimer === undefined || nextRef === serverRef) return

		const cookie = store.read()
		const editorOwnsCookie = Boolean(editorOwner(cookie))

		if (nextRef === null) {
			// The session ended. Clear the cookie only when it still holds this session's ref.
			const ownsCookie = !editorOwnsCookie && refFor(cookie, repositoryHost) === serverRef
			stopPolling()
			void bridge.closeSession().catch(() => {})
			serverRef = undefined
			setSnapshot({ status: "idle", preview: undefined })
			if (ownsCookie) {
				store.removeOwn()
				reconcile()
			}
			return
		}

		serverRef = nextRef
		if (snapshot.preview) setSnapshot({ preview: { ...snapshot.preview, ref: nextRef } })
		// Never overwrite a ref the editor pushed. An unchanged ref above never writes either, which
		// keeps this tab from fighting the editor over the cookie.
		if (editorOwnsCookie) return

		if (refFor(cookie, repositoryHost) !== nextRef && !writeRef(nextRef)) return
		reconcile()
	}

	/** Connects, then follows the repository's preview session if one is active. */
	async function follow() {
		if (following) return
		following = true
		try {
			bridge ??= await connect()
			const state = await bridge.getState()
			// A cookie change meanwhile may already be reloading the page.
			if (isReloading()) return
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
			if (editorOwner(cookie)) {
				reconcileEditorPush()
				if (isReloading()) return
			} else if (refFor(cookie, repositoryHost) !== serverRef) {
				if (!writeRef(serverRef)) return setSnapshot({ status: "idle" })
				renderedRef = serverRef
				if (dispatchPreviewEvent("prismicPreviewStart", serverRef)) return reloadPage()
			} else if (cookie.kind === "plain" && codec === "json") {
				// SDK preview routes store the raw ref, which already renders the session.
				writeRef(serverRef)
			}

			setSnapshot({ status: "polling", preview: state.preview })
			startPolling()
		} catch (error) {
			warn(`Could not reach the preview session.\n\n${String(error)}`)
			setSnapshot({ status: "idle" })
		} finally {
			following = false
		}
	}

	return {
		start: follow,

		async exit() {
			stopPolling()
			await bridge?.closeSession().catch(() => {})
			serverRef = undefined

			const owner = editorOwner(store.read())
			if (!owner) {
				store.removeOwn()
			} else if (owner.repository === repositoryHost) {
				releaseOwnership()
				store.deleteAll()
			} // Otherwise another repository's editor owns the cookie: leave it.

			renderedRef = currentRef()
			setSnapshot({ status: "idle", preview: undefined })
			if (dispatchPreviewEvent("prismicPreviewEnd")) reloadPage()
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
			unwatch?.()
			bridge?.dispose()
			listeners.clear()
		},
	}
}
