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

export type BridgeMethodName = keyof BridgeMethods

export type BridgeRequest = {
	[Method in BridgeMethodName]: {
		id: number
		method: Method
		params: Parameters<BridgeMethods[Method]>
	}
}[BridgeMethodName]

export type BridgeResponse = { id: number; result: unknown } | { id: number; error: string }

const methodNames: ReadonlySet<string> = new Set<BridgeMethodName>([
	"getState",
	"ping",
	"closeSession",
	"share",
])

export function isConnectMessage(data: unknown): boolean {
	return isObject(data) && data.type === connectMessageType
}

export function isReadyMessage(data: unknown): boolean {
	return isObject(data) && data.type === readyMessageType
}

export function isBridgeRequest(data: unknown): data is BridgeRequest {
	return (
		isObject(data) &&
		typeof data.id === "number" &&
		typeof data.method === "string" &&
		methodNames.has(data.method) &&
		Array.isArray(data.params)
	)
}

export function isBridgeResponse(data: unknown): data is BridgeResponse {
	return isObject(data) && typeof data.id === "number" && ("result" in data || "error" in data)
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object"
}
