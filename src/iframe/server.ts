import {
	isBridgeRequest,
	isConnectMessage,
	readyMessageType,
	type BridgeMethods,
	type BridgeResponse,
	type BridgeState,
} from "~/core/bridge-protocol"
import { deleteCookieEverywhere, getCookie } from "~/core/cookie"

/** Set by Prismic on the repository host when a preview session starts. */
export const sessionCookieName = "io.prismic.previewSession"
/** Set by Prismic on the repository host for signed-in users. */
export const loggedInCookieName = "is-logged-in"

interface ServerState extends BridgeState {
	csrf: string | null
}

export interface BridgeServerDependencies {
	fetch: typeof fetch
	getCookie: (name: string) => string | undefined
	deleteSessionCookie: () => void
}

const defaultDependencies: BridgeServerDependencies = {
	fetch: (...args) => fetch(...args),
	getCookie,
	deleteSessionCookie: () =>
		deleteCookieEverywhere(sessionCookieName, { sameSite: "none", secure: true }),
}

/** Implements the bridge on the repository host, with relative requests to Prismic. */
export function createBridgeHandlers(
	dependencies: BridgeServerDependencies = defaultDependencies,
): BridgeMethods {
	const { fetch, getCookie, deleteSessionCookie } = dependencies
	let state: Promise<ServerState> | undefined
	let ping: Promise<{ ref: string | null }> | undefined
	const shares = new Map<string, Promise<string>>()

	function loadState(): Promise<ServerState> {
		state ??= fetchState().catch((error: unknown) => {
			state = undefined
			throw error
		})
		return state
	}

	async function fetchState(): Promise<ServerState> {
		// Without these cookies, Prismic has nothing to report; skip the request.
		if (!getCookie(loggedInCookieName) && !getCookie(sessionCookieName)) {
			return { csrf: null, isAuthenticated: false }
		}

		return normalizeState(await fetchJSON(fetch, "/toolbar/state"))
	}

	return {
		async getState() {
			const { isAuthenticated, preview } = await loadState()
			return preview ? { isAuthenticated, preview } : { isAuthenticated }
		},

		async ping(ref) {
			// Read the session on every ping: another tab may have replaced or closed it.
			const session = getCookie(sessionCookieName)
			if (!session) return { ref: null }

			// Prismic answers `{ ref, reload }`, or `{ close: true }` once the session ended.
			ping ??= fetchJSON(fetch, `/previews/${session}/ping?ref=${encodeURIComponent(ref)}`)
				.then((response) => {
					const currentRef = isObject(response) ? response.ref : undefined
					return { ref: typeof currentRef === "string" && currentRef ? currentRef : null }
				})
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

	async function createShareLink(pageURL: string): Promise<string> {
		const session = getCookie(sessionCookieName)
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

		const response = await fetchJSON(fetch, `/previews/s?${query}`, { method: "POST" })
		const url = isObject(response) ? response.url : undefined
		if (typeof url !== "string" || !url) throw new Error("Prismic did not return a share link.")

		return url
	}
}

/** Serves bridge requests on every port a website connects with. Ignores any other message. */
export function serveBridge(handlers: BridgeMethods = createBridgeHandlers()): () => void {
	function handleConnect(event: MessageEvent) {
		const port = event.ports[0]
		if (isConnectMessage(event.data) && port) servePort(port, handlers)
	}

	window.addEventListener("message", handleConnect)
	return () => window.removeEventListener("message", handleConnect)
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

function normalizeState(response: unknown): ServerState {
	const data = isObject(response) ? response : {}
	const previewState = isObject(data.previewState) ? data.previewState : undefined
	const ref = previewState?.ref

	return {
		csrf: typeof data.csrf === "string" ? data.csrf : null,
		isAuthenticated: Boolean(data.isAuthenticated),
		preview:
			typeof ref === "string" && ref
				? { ref, title: typeof previewState?.title === "string" ? previewState.title : "" }
				: undefined,
	}
}

async function fetchJSON(fetch: typeof globalThis.fetch, url: string, init?: RequestInit) {
	const response = await fetch(url, init)
	if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${url} responded ${response.status}.`)
	return (await response.json()) as unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object"
}
