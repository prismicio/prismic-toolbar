import { watchCookie } from "./cookie-watcher"
import { warn } from "./env"
import { dispatchPreviewEvent } from "./events"
import { liveOwner, releaseOwnership } from "./owner-marker"
import { ping, type PingResponse } from "./ping"
import type { Shell } from "./shell-client"
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
	connect(): Promise<Shell>
	reload?: () => void
	/** When this page's navigation started, comparable with `Date.now()`. */
	navigationStart?: number
	store?: SiteCookieStore
}

/**
 * Keeps the website's preview cookie in sync with the repository's preview session, which the shell
 * reads and Prismic's public `ping` follows, and tells the website when the ref it renders is
 * stale. Every notification goes through `reconcile`, which compares the cookie with the ref this
 * page renders, so polling, cookie changes and this page's own writes notify at most once per ref.
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
	let shell: Shell | undefined
	/** The followed session, and its ref while following it. */
	let session: string | undefined
	let serverRef: string | undefined
	let pollTimer: ReturnType<typeof setInterval> | undefined
	let following = Promise.resolve()

	const currentRef = () => refFor(store.read(), repositoryHost)
	// Read before anything can change the cookie: the closest guess of what the server rendered.
	const initialRef = currentRef()
	let renderedRef = initialRef
	// Watch before connecting so a change during startup is not mistaken for the rendered ref.
	const unwatch = watch
		? watchCookie(previewCookieName, () => {
				reconcile()
				// Another tab or a preview route started, replaced, or exited a session: read it again. The
				// editor pushes refs on every edit, within the same session.
				if (isReloading() || currentRef() === serverRef || editorOwner(store.read())) return
				stopPolling()
				serverRef = undefined
				void follow()
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
		if (!session || serverRef === undefined || document.visibilityState !== "visible") return

		const pinged = session
		const pingedRef = serverRef
		let state: PingResponse
		try {
			state = await ping(repositoryHost, pinged, pingedRef)
		} catch {
			return // Transient failure: try again on the next tick.
		}
		// Polling may have stopped or followed another session during the ping, such as on exit,
		// reload, or a session another tab started.
		if (pollTimer === undefined || session !== pinged || serverRef !== pingedRef) return

		const nextRef = state.ref
		if (nextRef && snapshot.preview)
			setSnapshot({ preview: { ref: nextRef, title: state.title || "" } })
		if (nextRef === serverRef) return

		const cookie = store.read()
		const editorOwnsCookie = Boolean(editorOwner(cookie))

		if (!nextRef) {
			// The session ended. Clear the cookie only when it still holds this session's ref.
			const ownsCookie = !editorOwnsCookie && refFor(cookie, repositoryHost) === serverRef
			stopPolling()
			serverRef = undefined
			setSnapshot({ status: "idle", preview: undefined })
			if (ownsCookie) {
				store.removeOwn()
				reconcile()
			}
			return
		}

		serverRef = nextRef
		// Never overwrite a ref the editor pushed. An unchanged ref above never writes either, which
		// keeps this tab from fighting the editor over the cookie.
		if (editorOwnsCookie) return

		if (refFor(cookie, repositoryHost) !== nextRef && !writeRef(nextRef)) return
		reconcile()
	}

	/** Connects, then follows the repository's preview session if one is active. Runs one at a time. */
	const follow = () => (following = following.then(followOnce))

	async function followOnce() {
		if (serverRef !== undefined) return
		try {
			shell ??= await connect()
			const { session: id, authenticated } = await shell.getSession()
			const state = id ? await ping(repositoryHost, id, currentRef() ?? "") : undefined
			// A cookie change meanwhile may already be reloading the page.
			if (isReloading()) return
			setSnapshot({ authenticated })

			if (!id || !state?.ref) {
				// Clear an ended repository session, but leave the website's cookie: another tab or the
				// editor may own it.
				if (id) void shell.closeSession().catch(() => {})
				setSnapshot({ status: "idle", preview: undefined })
				reconcileEditorPush()
				return
			}

			session = id
			serverRef = state.ref
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

			setSnapshot({ status: "polling", preview: { ref: serverRef, title: state.title || "" } })
			startPolling()
		} catch (error) {
			warn(`Could not reach the preview session.\n\n${String(error)}`)
			setSnapshot({ status: "idle" })
		}
	}

	return {
		start: follow,

		async exit() {
			stopPolling()
			await shell?.closeSession().catch(() => {})
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
			if (!shell) throw new Error("The preview session is not connected.")
			return shell.share(pageURL, snapshot.preview?.title ?? "")
		},

		getSnapshot: () => snapshot,

		subscribe(listener) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},

		dispose() {
			stopPolling()
			unwatch?.()
			shell?.dispose()
			listeners.clear()
		},
	}
}
