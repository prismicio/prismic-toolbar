import {
	connectMessageType,
	isBridgeResponse,
	isMessage,
	readyMessageType,
	type BridgeMethods,
	type BridgeState,
} from "./bridge-protocol"
import { readyDOM } from "./dom"

export interface Bridge extends BridgeMethods {
	dispose(): void
}

/** Loads the repository iframe and connects to it. Rejects when it does not answer in time. */
export async function connectBridge(url: string, timeout = 15_000): Promise<Bridge> {
	await readyDOM()

	const iframe = Object.assign(document.createElement("iframe"), {
		src: url,
		title: "Prismic toolbar",
		tabIndex: -1,
	})
	iframe.setAttribute("aria-hidden", "true")
	iframe.style.cssText = "display:none!important"

	const { port1: port, port2 } = new MessageChannel()
	const connected = new Promise<void>((resolve) => {
		port.onmessage = (event) => {
			if (isMessage(event.data, readyMessageType)) resolve()
		}
		iframe.addEventListener("load", () => {
			const message = { type: connectMessageType }
			iframe.contentWindow?.postMessage(message, new URL(url).origin, [port2])
		})
	})
	document.body.appendChild(iframe)

	try {
		await withTimeout(connected, timeout, "the repository iframe did not answer in time")
	} catch (error) {
		port.close()
		iframe.remove()
		throw error
	}

	return createBridgeClient(port, { timeout, onDispose: () => iframe.remove() })
}

/** Calls bridge methods over a connected port. Each call rejects when it does not answer in time. */
export function createBridgeClient(
	port: MessagePort,
	{ timeout = 15_000, onDispose }: { timeout?: number; onDispose?: () => void } = {},
): Bridge {
	const pending = new Map<number, { resolve(result: unknown): void; reject(error: Error): void }>()
	let lastId = 0

	port.onmessage = ({ data }) => {
		if (!isBridgeResponse(data)) return
		if ("error" in data) pending.get(data.id)?.reject(new Error(data.error))
		else pending.get(data.id)?.resolve(data.result)
	}

	function call(method: keyof BridgeMethods, ...params: unknown[]): Promise<unknown> {
		const id = ++lastId
		const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
		port.postMessage({ id, method, params })
		return withTimeout(response, timeout, `${method} timed out`).finally(() => pending.delete(id))
	}

	return {
		getState: () => call("getState") as Promise<BridgeState>,
		ping: (ref) => call("ping", ref) as Promise<{ ref: string | null }>,
		closeSession: () => call("closeSession") as Promise<void>,
		share: (pageURL) => call("share", pageURL) as Promise<string>,
		dispose() {
			const disposed = new Error("Prismic toolbar: bridge disposed.")
			for (const { reject } of pending.values()) reject(disposed)
			port.close()
			onDispose?.()
		},
	}
}

function withTimeout<T>(promise: Promise<T>, timeout: number, reason: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined
	const timedOut = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Prismic toolbar: ${reason}.`)), timeout)
	})
	return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer))
}
