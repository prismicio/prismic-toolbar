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
