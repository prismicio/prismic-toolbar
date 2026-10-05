import { readyDOM } from "@common"

import {
	connectMessageType,
	isBridgeResponse,
	isReadyMessage,
	type BridgeMethodName,
	type BridgeMethods,
	type BridgeRequest,
} from "./bridge-protocol"

export interface Bridge extends BridgeMethods {
	dispose(): void
}

const defaultTimeout = 15_000

/** Loads the repository iframe and connects to it. Rejects when it does not answer in time. */
export async function connectBridge(
	url: string,
	{ timeout = defaultTimeout }: { timeout?: number } = {},
): Promise<Bridge> {
	await readyDOM()

	const iframe = document.createElement("iframe")
	iframe.src = url
	iframe.title = "Prismic toolbar"
	iframe.tabIndex = -1
	iframe.setAttribute("aria-hidden", "true")
	iframe.style.cssText = "display:none!important"

	const loaded = new Promise<void>((resolve) =>
		iframe.addEventListener("load", () => resolve(), { once: true }),
	)
	document.body.appendChild(iframe)

	const { port1: port, port2 } = new MessageChannel()
	try {
		await withTimeout(loaded, timeout, "load")
		const ready = new Promise<void>((resolve) => {
			port.onmessage = (event) => {
				if (isReadyMessage(event.data)) resolve()
			}
		})
		iframe.contentWindow?.postMessage({ type: connectMessageType }, new URL(url).origin, [port2])
		await withTimeout(ready, timeout, "connect")
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
	{ timeout = defaultTimeout, onDispose }: { timeout?: number; onDispose?: () => void } = {},
): Bridge {
	const pending = new Map<
		number,
		{
			resolve(value: unknown): void
			reject(error: Error): void
			timer: ReturnType<typeof setTimeout>
		}
	>()
	let lastId = 0

	port.onmessage = (event) => {
		const response: unknown = event.data
		if (!isBridgeResponse(response)) return
		const call = pending.get(response.id)
		if (!call) return

		pending.delete(response.id)
		clearTimeout(call.timer)
		if ("error" in response) call.reject(new Error(response.error))
		else call.resolve(response.result)
	}

	function call<Method extends BridgeMethodName>(
		method: Method,
		...params: Parameters<BridgeMethods[Method]>
	): ReturnType<BridgeMethods[Method]> {
		return new Promise((resolve, reject) => {
			const id = ++lastId
			const timer = setTimeout(() => {
				pending.delete(id)
				reject(new Error(`Prismic toolbar: ${method} timed out.`))
			}, timeout)
			pending.set(id, { resolve, reject, timer })
			port.postMessage({ id, method, params } as BridgeRequest)
		}) as ReturnType<BridgeMethods[Method]>
	}

	return {
		getState: () => call("getState"),
		ping: (ref) => call("ping", ref),
		closeSession: () => call("closeSession"),
		share: (pageURL) => call("share", pageURL),
		dispose() {
			for (const { reject, timer } of pending.values()) {
				clearTimeout(timer)
				reject(new Error("Prismic toolbar: bridge disposed."))
			}
			pending.clear()
			port.close()
			onDispose?.()
		},
	}
}

function withTimeout<T>(promise: Promise<T>, timeout: number, step: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`Prismic toolbar: the repository iframe did not ${step} in time.`)),
			timeout,
		)
		promise.then(
			(value) => {
				clearTimeout(timer)
				resolve(value)
			},
			(error: unknown) => {
				clearTimeout(timer)
				reject(error)
			},
		)
	})
}
