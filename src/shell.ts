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

/**
 * Prismic checks `origin`, the page asking, against the session's website. It returns `ref` to that
 * website, `close` once the session ended, and neither to another website.
 */
type Ping = { ref?: string; title?: string; close?: boolean }

async function pingSession(session: string, origin: string, ref = ""): Promise<Ping> {
	const response = await fetch(`/previews/${session}/ping?${new URLSearchParams({ ref, origin })}`)
	if (!response.ok) throw new Error(`Prismic responded ${response.status} to ping.`)
	return response.json()
}

const shares = new Map<string, Promise<string>>()

function createMethods(origin: string): ShellMethods {
	/** The session in the cookie, when it is live and `origin` previews it. */
	async function ownSession() {
		const session = getCookie(sessionCookieName)
		if (session && (await pingSession(session, origin)).ref) return session
	}

	const methods: ShellMethods = {
		// Prismic's auth cookies are HttpOnly, so only Prismic knows. A failed request counts as signed out.
		async isAuthenticated() {
			try {
				if (!(await ownSession())) return false
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

			const ping = await pingSession(session, origin, ref)

			const current = getCookie(sessionCookieName)
			// Another tab or a share link replaced the session meanwhile: ping the new one.
			if (current !== session) return current ? methods.ping(ref) : {}
			if (ping.ref) return { ref: ping.ref, title: ping.title }
			// Checked and deleted in one step, so a session started meanwhile survives. Another
			// website's session stays open: this page just has none.
			if (ping.close) deleteSessionCookie()
			return {}
		},

		async closeSession() {
			if (await ownSession()) deleteSessionCookie()
		},

		async share(pageURL, title) {
			const session = await ownSession()
			if (!session) throw new Error("No active preview session to share.")
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
	return methods
}

async function createShareLink(session: string, pageURL: string, title: string): Promise<string> {
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

/**
 * Without a live session, any page connects, since each call checks again. Otherwise, pages that
 * are not on the session's website get no answer.
 */
async function acceptsConnection(origin: string) {
	const session = getCookie(sessionCookieName)
	if (!session) return true
	try {
		const ping = await pingSession(session, origin)
		return Boolean(ping.ref || ping.close)
	} catch {
		return false
	}
}

addEventListener("message", async ({ data, origin, ports: [port] }) => {
	if (data?.type !== shellConnectType || !port || !(await acceptsConnection(origin))) return

	const methods = createMethods(origin)
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
