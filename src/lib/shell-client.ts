import { readyDOM } from "./dom"

/**
 * Protocol between legacy websites and the shell page on the repository host, which reads the
 * repository's cookies for them. The shell will move to a stable path shared by every `prismic.js`
 * version, so this protocol is frozen: add new message types, never change existing ones. Both ends
 * ignore messages they do not know.
 *
 * - The website posts `connect` to the shell's window with a `MessagePort`, which carries every later
 *   message. The shell answers `ready`.
 * - The website calls a method with `{ type: "<prefix><method>", id, params }`.
 * - The shell answers `{ type: "<prefix>response", id, result }`, or `error` instead of `result`.
 */
export const shellPrefix = "prismic:shell:"

export interface ShellMethods {
	/** Reads the repository's cookies, without any request. */
	getSession(): Promise<{ session: string | null; authenticated: boolean }>
	/** Deletes the repository's session cookie, so the session does not come back on the next page. */
	closeSession(): Promise<void>
	/** Returns a shareable link to the preview session on `pageURL`. */
	share(pageURL: string, title: string): Promise<string>
}

export type ShellRequest = { type: string; id: number; params: unknown[] }
export type ShellResponse = { type: string; id: number } & ({ result: unknown } | { error: string })

export interface Shell extends ShellMethods {
	dispose(): void
}

/**
 * Loads the repository's shell page and connects to it. Rejects when it does not answer in time,
 * and so does each call.
 */
export async function connectShell(url: string, timeout = 15_000): Promise<Shell> {
	await readyDOM()

	const iframe = Object.assign(document.createElement("iframe"), {
		src: url,
		title: "Prismic toolbar",
		tabIndex: -1,
	})
	iframe.setAttribute("aria-hidden", "true")
	iframe.style.cssText = "display:none!important"

	const { port1: port, port2 } = new MessageChannel()
	const pending = new Map<number, (response: ShellResponse) => void>()
	let lastId = 0

	const connected = new Promise<void>((resolve) => {
		port.onmessage = ({ data }: MessageEvent<ShellResponse | null>) => {
			if (data?.type === `${shellPrefix}ready`) resolve()
			else if (data?.type === `${shellPrefix}response`) pending.get(data.id)?.(data)
		}
	})
	// A port can only be transferred once, so a reloaded shell must not resend it.
	iframe.addEventListener(
		"load",
		() => {
			const message = { type: `${shellPrefix}connect` }
			iframe.contentWindow?.postMessage(message, new URL(url).origin, [port2])
		},
		{ once: true },
	)
	document.body.appendChild(iframe)

	function dispose() {
		port.close()
		iframe.remove()
	}

	try {
		await withTimeout(connected, timeout, "the repository shell did not answer in time")
	} catch (error) {
		dispose()
		throw error
	}

	function call<T>(method: keyof ShellMethods, ...params: unknown[]): Promise<T> {
		const id = ++lastId
		const response = new Promise<T>((resolve, reject) => {
			pending.set(id, (data) => {
				if ("error" in data) reject(new Error(data.error))
				else resolve(data.result as T)
			})
		})
		port.postMessage({ type: `${shellPrefix}${method}`, id, params })
		return withTimeout(response, timeout, `${method} timed out`).finally(() => pending.delete(id))
	}

	return {
		getSession: () => call("getSession"),
		closeSession: () => call("closeSession"),
		share: (pageURL, title) => call("share", pageURL, title),
		dispose,
	}
}

function withTimeout<T>(promise: Promise<T>, timeout: number, reason: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined
	const timedOut = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Prismic toolbar: ${reason}.`)), timeout)
	})
	return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer))
}
