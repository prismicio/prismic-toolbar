import { shellConnectType, type ShellMethods, type ShellRequest } from "./lib/shell-client"

// Runs on the repository host, where the repository's cookies are first-party. Kept apart from
// `src/lib/cookie.ts`, which handles any website's cookies, so the page stays small.

/** Set by Prismic on the repository host when a preview session starts. */
const sessionCookieName = "io.prismic.previewSession"

const getCookie = (name: string) =>
	document.cookie
		.split("; ")
		.find((cookie) => cookie.startsWith(`${name}=`))
		?.slice(name.length + 1)

// Matches how wroom writes it: host-only on `/`.
function deleteSessionCookie() {
	document.cookie = `${sessionCookieName}=; path=/; max-age=0; SameSite=None; Secure`
}

const shares = new Map<string, Promise<string>>()

const methods: ShellMethods = {
	// Prismic's auth cookies are HttpOnly, so only Prismic knows. A failed request counts as signed out.
	async isAuthenticated() {
		if (!getCookie(sessionCookieName)) return false
		try {
			const response = await fetch("/toolbar/state")
			return response.ok && Boolean((await response.json()).isAuthenticated)
		} catch {
			return false
		}
	},

	async ping(ref) {
		// Read on every ping: another tab or website may have replaced or closed the session.
		const session = getCookie(sessionCookieName)
		if (!session) return {}

		const response = await fetch(`/previews/${session}/ping?ref=${encodeURIComponent(ref)}`)
		if (!response.ok) throw new Error(`Prismic responded ${response.status} to ping.`)
		// `{ ref, title }`, or `{ close: true }` once the session ended.
		const { ref: next, title } = await response.json()

		const current = getCookie(sessionCookieName)
		// Another tab replaced the session meanwhile: report no change, so the next ping follows it.
		if (current !== session) return current ? { ref } : {}
		if (next) return { ref: next, title }
		// Checked and deleted in one step, so a session started meanwhile survives.
		deleteSessionCookie()
		return {}
	},

	async closeSession() {
		deleteSessionCookie()
	},

	share(pageURL, title) {
		const session = getCookie(sessionCookieName)
		// A later session on the same page needs its own link.
		const key = `${session} ${pageURL}`
		let share = shares.get(key)
		if (!share) {
			share = createShareLink(session, pageURL, title)
			share.catch(() => shares.delete(key))
			shares.set(key, share)
		}
		return share
	},
}

async function createShareLink(
	session: string | undefined,
	pageURL: string,
	title: string,
): Promise<string> {
	if (!session) throw new Error("No active preview session to share.")

	// Screenshots are no longer uploaded, so Prismic shows its default image. Sends no CSRF token:
	// Prismic no longer returns or checks one.
	const query = new URLSearchParams({
		sessionId: session,
		pageURL,
		title,
		imageName: "default-preview.png",
	})
	const response = await fetch(`/previews/s?${query}`, { method: "POST" })
	if (!response.ok) throw new Error(`Prismic responded ${response.status} to the share request.`)

	const { url } = await response.json()
	if (typeof url !== "string" || !url) throw new Error("Prismic did not return a share link.")
	return url
}

addEventListener("message", ({ data, ports: [port] }) => {
	if (data?.type !== shellConnectType || !port) return

	port.onmessage = async ({ data: { id, method, params } }: MessageEvent<ShellRequest>) => {
		try {
			const handler = methods[method] as (...params: unknown[]) => unknown
			port.postMessage({ id, result: await handler(...params) })
		} catch (error) {
			port.postMessage({ id, error: (error as Error).message })
		}
	}
	port.postMessage("ready")
})
