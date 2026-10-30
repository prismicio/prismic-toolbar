import { watchCookie } from "./cookie-watcher"
import { warn } from "./env"
import { dispatchPreviewEvent } from "./events"
import { connectShell, type Shell } from "./shell-client"
import {
	deletePreviewCookie,
	previewCookieName,
	readPreviewRef,
	writePreviewRef,
	type SiteCookieCodec,
} from "./site-cookie"

export interface PreviewSnapshot {
	status: "booting" | "idle" | "polling" | "reloading"
	/** Unset when unknown, as in v5. */
	authenticated?: boolean
	/** Set while this page follows an active preview session. */
	preview?: { ref: string; title: string }
}

export interface PreviewSession {
	start(): Promise<void>
	/** Ends the preview session for this browser. */
	exit(): Promise<void>
	share(): string | Promise<string>
	getSnapshot(): PreviewSnapshot
	subscribe(listener: (snapshot: PreviewSnapshot) => void): () => void
	dispose(): void
}

export interface PreviewSessionOptions {
	repositoryHost: string
	/** `json` on websites, `plain` inside the editor. */
	codec: SiteCookieCodec
	/**
	 * Follows preview cookie changes made outside this page, such as editor pushes. Off in the
	 * editor, where the preview session sets the ref.
	 */
	watchCookie: boolean
}

/**
 * Keeps the website's preview cookie in sync with the repository's preview session, which the
 * repository's shell reads and pings, and tells the website when the ref it renders is stale. Every
 * notification goes through `reconcile`, which compares the cookie with the ref this page renders,
 * so polling, cookie changes and this page's own writes notify at most once per ref.
 */
export function createPreviewSession({
	repositoryHost,
	codec,
	watchCookie: watch,
}: PreviewSessionOptions): PreviewSession {
	const listeners = new Set<(snapshot: PreviewSnapshot) => void>()
	let snapshot: PreviewSnapshot = { status: "booting", authenticated: false }
	let shell: Shell | undefined
	let serverRef: string | undefined
	let pollTimer: ReturnType<typeof setInterval> | undefined
	let following = Promise.resolve()

	const currentRef = () => readPreviewRef(repositoryHost)
	// Read before anything can change the cookie: the closest guess of what the server rendered.
	let renderedRef = currentRef()
	// Watch before connecting so a change during startup is not mistaken for the rendered ref.
	const unwatch = watch
		? watchCookie(previewCookieName, () => {
				reconcile()
				// A tab that was not previewing follows a session another tab or a share link started.
				if (currentRef() !== undefined) void follow()
			})
		: undefined

	function setSnapshot(patch: Partial<PreviewSnapshot>) {
		snapshot = { ...snapshot, ...patch }
		for (const listener of listeners) listener(snapshot)
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
		window.location.reload()
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

	const writeRef = (ref: string) => writePreviewRef(repositoryHost, ref, codec)

	async function tick() {
		if (!shell || serverRef === undefined || document.visibilityState !== "visible") return

		const pingedRef = serverRef
		let nextRef: string | undefined
		try {
			nextRef = (await shell.ping(pingedRef)).ref
		} catch {
			return // Transient failure: try again on the next tick.
		}
		// Polling may have stopped or followed another session during the ping, such as on exit,
		// reload, or a session another tab started.
		if (pollTimer === undefined || serverRef !== pingedRef || nextRef === serverRef) return

		if (!nextRef) {
			// The session ended. Clear the cookie only when it still holds this session's ref.
			const ownsCookie = currentRef() === serverRef
			stopPolling()
			serverRef = undefined
			setSnapshot({ status: "idle", preview: undefined })
			if (ownsCookie) {
				deletePreviewCookie()
				reconcile()
			}
			return
		}

		serverRef = nextRef
		if (snapshot.preview) setSnapshot({ preview: { ...snapshot.preview, ref: nextRef } })
		if (currentRef() !== nextRef && !writeRef(nextRef)) return
		reconcile()
	}

	/** Connects, then follows the repository's preview session if one is active. Runs one at a time. */
	const follow = () => (following = following.then(followOnce))

	async function followOnce() {
		if (serverRef !== undefined) return
		try {
			shell ??= await connectShell(repositoryHost)
			const authenticated = await shell.isAuthenticated()
			const { ref, title = "" } = await shell.ping(currentRef() ?? "")
			// A cookie change meanwhile may already be reloading the page.
			if (isReloading()) return
			setSnapshot({ authenticated })

			// Leave the website's cookie when the session ended: another tab or the editor may own it.
			if (!ref) return setSnapshot({ status: "idle" })

			serverRef = ref
			if (currentRef() !== serverRef) {
				if (!writeRef(serverRef)) return setSnapshot({ status: "idle" })
				renderedRef = serverRef
				if (dispatchPreviewEvent("prismicPreviewStart", serverRef)) return reloadPage()
			}

			setSnapshot({ status: "polling", preview: { ref, title } })
			pollTimer = setInterval(tick, 3000)
			// A tab coming back into view catches up right away.
			document.addEventListener("visibilitychange", tick)
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
			deletePreviewCookie()
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
