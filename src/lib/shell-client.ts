import { readyDOM } from "./dom"
import { repositoryOrigin } from "./env"

/** The asset folder, such as a commit's short SHA or `pr-<number>`. See `vite.config.ts`. */
declare const __TOOLBAR_VERSION__: string

/**
 * Protocol between v4 websites and the shell page on the repository host, which reads the
 * repository's cookies for them. The shell deploys next to each `prismic.js`, so both change
 * together.
 *
 * - The website posts `connect` to the shell's window with a `MessagePort`, which carries every later
 *   message. The shell answers `"ready"`.
 * - The website calls a method with `{ id, method, params }`.
 * - The shell answers `{ id, result }`, or `{ id, error }`.
 */
export const shellConnectType = "prismic:shell:connect"

export interface ShellMethods {
	/** Asks Prismic whether the user is signed in, when a preview session exists. */
	isAuthenticated(): Promise<boolean>
	/**
	 * Asks Prismic for the session's ref and title, reading the session cookie each time. Without a
	 * ref, the session ended, and its cookie is deleted.
	 */
	ping(ref: string): Promise<{ ref?: string; title?: string }>
	/** Deletes the repository's session cookie, so the session does not come back on the next page. */
	closeSession(): Promise<void>
	/** Returns a shareable link to the preview session on `pageURL`. */
	share(pageURL: string, title: string): Promise<string>
}

export type ShellRequest = { id: number; method: keyof ShellMethods; params: unknown[] }
export type ShellResponse = { id: number } & ({ result: unknown } | { error: string })

export interface Shell extends ShellMethods {
	dispose(): void
}

/**
 * Loads the repository's shell page, deployed with this toolbar version, and connects to it.
 * Rejects when it does not answer within 15 seconds, and so does each call.
 */
export async function connectShell(repositoryHost: string): Promise<Shell> {
	await readyDOM()

	const url = `${repositoryOrigin(repositoryHost)}/prismic-toolbar/${__TOOLBAR_VERSION__}/shell.html`

	const iframe = Object.assign(document.createElement("iframe"), {
		src: url,
		title: "Prismic toolbar",
		tabIndex: -1,
	})
	iframe.setAttribute("aria-hidden", "true")
	iframe.style.cssText = "display:none!important"

	const { port1: port, port2 } = new MessageChannel()
	const pending = new Map<number, { resolve(result: unknown): void; reject(error: Error): void }>()
	let lastId = 0

	const connected = new Promise<void>((resolve) => {
		port.onmessage = ({ data }: MessageEvent<ShellResponse | "ready">) => {
			if (data === "ready") resolve()
			else if ("error" in data) pending.get(data.id)?.reject(new Error(data.error))
			else pending.get(data.id)?.resolve(data.result)
		}
	})
	// A port can only be transferred once, so a reloaded shell must not resend it.
	iframe.addEventListener(
		"load",
		() => {
			const message = { type: shellConnectType }
			iframe.contentWindow?.postMessage(message, new URL(url).origin, [port2])
		},
		{ once: true },
	)
	document.body.appendChild(iframe)

	function dispose() {
		const disposed = new Error("Prismic toolbar: shell disposed.")
		for (const { reject } of pending.values()) reject(disposed)
		port.close()
		iframe.remove()
	}

	try {
		await withTimeout(connected, "the repository shell did not answer in time")
	} catch (error) {
		dispose()
		throw error
	}

	function call<T>(method: keyof ShellMethods, ...params: unknown[]): Promise<T> {
		const id = ++lastId
		const response = new Promise<T>((resolve, reject) => pending.set(id, { resolve, reject }))
		port.postMessage({ id, method, params })
		return withTimeout(response, `${method} timed out`).finally(() => pending.delete(id))
	}

	return {
		isAuthenticated: () => call("isAuthenticated"),
		ping: (ref) => call("ping", ref),
		closeSession: () => call("closeSession"),
		share: (pageURL, title) => call("share", pageURL, title),
		dispose,
	}
}

function withTimeout<T>(promise: Promise<T>, reason: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined
	const timedOut = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new Error(`Prismic toolbar: ${reason}.`)), 15_000)
	})
	return Promise.race([promise, timedOut]).finally(() => clearTimeout(timer))
}
