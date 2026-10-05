/**
 * Protocol between the toolbar on a website and its hidden iframe on the repository host. The
 * iframe reads the repository's cookies, which the website cannot, and calls Prismic on its behalf.
 * Both ends ship in the same versioned build, so the protocol can change freely between versions.
 */

/** Sent to the iframe window with a `MessagePort` that carries every later message. */
export const connectMessageType = "prismic-toolbar:connect"
/** Sent back over the port once the iframe serves requests. */
export const readyMessageType = "prismic-toolbar:ready"

export interface BridgeState {
	isAuthenticated: boolean
	/** The repository's active preview session, if any. */
	preview?: { ref: string; title: string }
}

export interface BridgeMethods {
	getState(): Promise<BridgeState>
	/** Returns the session's current ref, or `null` once the session ended. */
	ping(ref: string): Promise<{ ref: string | null }>
	closeSession(): Promise<void>
	/** Returns a shareable link to the preview session on `pageURL`. */
	share(pageURL: string): Promise<string>
}

export interface BridgeRequest {
	id: number
	method: keyof BridgeMethods
	params: unknown[]
}

export type BridgeResponse = { id: number; result: unknown } | { id: number; error: string }

const methods: ReadonlySet<unknown> = new Set(["getState", "ping", "closeSession", "share"])

export function isMessage(data: unknown, type: string): boolean {
	return isObject(data) && data.type === type
}

export function isBridgeRequest(data: unknown): data is BridgeRequest {
	return (
		isObject(data) &&
		typeof data.id === "number" &&
		methods.has(data.method) &&
		Array.isArray(data.params)
	)
}

export function isBridgeResponse(data: unknown): data is BridgeResponse {
	return isObject(data) && typeof data.id === "number" && ("result" in data || "error" in data)
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object"
}
