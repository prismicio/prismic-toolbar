import Cookies from "js-cookie"

import {
	connectMessageType,
	isBridgeRequest,
	isMessage,
	readyMessageType,
	type BridgeMethods,
	type BridgeResponse,
	type BridgeState,
} from "../core/bridge-protocol"

/** Set by Prismic on the repository host when a preview session starts. */
export const sessionCookieName = "io.prismic.previewSession"

/** Implements the bridge on the repository host, with relative requests to Prismic. */
export function createBridgeHandlers(): BridgeMethods {
	let state: Promise<BridgeState & { csrf?: string }> | undefined
	let ping: Promise<{ ref: string | null }> | undefined
	const shares = new Map<string, Promise<string>>()

	function loadState() {
		state ??= fetchState().catch((error: unknown) => {
			state = undefined
			throw error
		})
		return state
	}

	async function createShareLink(pageURL: string): Promise<string> {
		const session = Cookies.get(sessionCookieName)
		const { csrf, preview } = await loadState()
		if (!session || !preview) throw new Error("No active preview session to share.")

		// Prismic requires an image name; screenshots are no longer uploaded.
		const page = new URL(pageURL)
		const query = new URLSearchParams({
			sessionId: session,
			pageURL,
			title: preview.title,
			imageName: `${page.pathname.slice(1)}${page.hash}${session}.jpg`,
		})
		if (csrf) query.set("_", csrf)

		const { url } = await fetchJSON<{ url?: unknown }>(`/previews/s?${query}`, { method: "POST" })
		if (typeof url !== "string" || !url) throw new Error("Prismic did not return a share link.")
		return url
	}

	return {
		async getState() {
			const { isAuthenticated, preview } = await loadState()
			return preview ? { isAuthenticated, preview } : { isAuthenticated }
		},

		async ping(ref) {
			// Read the session on every ping: another tab may have replaced or closed it.
			const session = Cookies.get(sessionCookieName)
			if (!session) return { ref: null }

			// Prismic answers `{ ref, reload }`, or `{ close: true }` once the session ended.
			ping ??= fetchJSON<{ ref?: unknown }>(
				`/previews/${session}/ping?ref=${encodeURIComponent(ref)}`,
			)
				.then((response) => ({
					ref: typeof response.ref === "string" && response.ref ? response.ref : null,
				}))
				.finally(() => {
					ping = undefined
				})
			return ping
		},

		async closeSession() {
			deleteSessionCookie()
			state = undefined
		},

		share(pageURL) {
			let share = shares.get(pageURL)
			if (!share) {
				share = createShareLink(pageURL)
				share.catch(() => shares.delete(pageURL))
				shares.set(pageURL, share)
			}
			return share
		},
	}
}

/** Serves bridge requests on every port a website connects with. Ignores any other message. */
export function serveBridge(handlers: BridgeMethods = createBridgeHandlers()): void {
	window.addEventListener("message", (event) => {
		const port = event.ports[0]
		if (isMessage(event.data, connectMessageType) && port) servePort(port, handlers)
	})
}

/** Answers bridge requests received on a port, then announces it is ready. */
export function servePort(port: MessagePort, handlers: BridgeMethods): void {
	port.onmessage = async ({ data }: MessageEvent) => {
		if (!isBridgeRequest(data)) return

		let response: BridgeResponse
		try {
			const handler = handlers[data.method] as (...params: unknown[]) => Promise<unknown>
			response = { id: data.id, result: await handler(...data.params) }
		} catch (error) {
			response = { id: data.id, error: error instanceof Error ? error.message : String(error) }
		}
		port.postMessage(response)
	}
	port.postMessage({ type: readyMessageType })
}

async function fetchState(): Promise<BridgeState & { csrf?: string }> {
	// Without these cookies, Prismic has nothing to report.
	if (!Cookies.get("is-logged-in") && !Cookies.get(sessionCookieName)) {
		return { isAuthenticated: false }
	}

	const { csrf, isAuthenticated, previewState } = await fetchJSON<{
		csrf?: unknown
		isAuthenticated?: unknown
		previewState?: { ref?: unknown; title?: unknown } | null
	}>("/toolbar/state")
	const ref = previewState?.ref
	const title = previewState?.title

	return {
		csrf: typeof csrf === "string" ? csrf : undefined,
		isAuthenticated: Boolean(isAuthenticated),
		preview:
			typeof ref === "string" && ref
				? { ref, title: typeof title === "string" ? title : "" }
				: undefined,
	}
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, init)
	if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url} responded ${response.status}.`)
	return (await response.json()) as T
}

// Prismic writes the session cookie, so its exact domain and path are unknown: delete every variant.
function deleteSessionCookie() {
	const hostParts = window.location.hostname.split(".")
	const pathParts = window.location.pathname.slice(1).split("/")
	const domains = hostParts.flatMap((_, index) => {
		const domain = hostParts.slice(index).join(".")
		return [domain, `.${domain}`]
	})
	const paths = pathParts.flatMap((_, index) => {
		const path = `/${pathParts.slice(0, index + 1).join("/")}`
		return [path, `${path}/`]
	})

	for (const domain of [undefined, ...domains]) {
		for (const path of [undefined, "/", ...paths]) {
			Cookies.remove(sessionCookieName, { domain, path, sameSite: "none", secure: true })
		}
	}
}
