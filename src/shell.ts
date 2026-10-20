import { shellPrefix, type ShellMethods, type ShellRequest } from "./lib/shell-client"

// Runs on the repository host, where the repository's cookies are first-party. Kept apart from
// `src/lib/cookie.ts`, which handles any website's cookies, so the page stays small.

/** Set by Prismic on the repository host when a preview session starts. */
const sessionCookieName = "io.prismic.previewSession"

const getCookie = (name: string) =>
	document.cookie
		.split("; ")
		.find((cookie) => cookie.startsWith(`${name}=`))
		?.slice(name.length + 1)

// Prismic writes the session cookie, so its exact domain and path are unknown: delete every variant.
function deleteSessionCookie() {
	const hosts = location.hostname.split(".")
	const segments = location.pathname.split("/")
	const domains = [""]
	const paths = ["", "; path=/"]
	// Skip the top-level domain: browsers reject cookies set on it, and Firefox logs each attempt.
	for (let index = 0; index < hosts.length - 1; index++) {
		const domain = hosts.slice(index).join(".")
		domains.push(`; domain=${domain}`, `; domain=.${domain}`)
	}
	for (let index = 2; index <= segments.length; index++) {
		const path = segments.slice(0, index).join("/")
		paths.push(`; path=${path}`, `; path=${path}/`)
	}

	for (const domain of domains) {
		for (const path of paths) {
			document.cookie = `${sessionCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure${domain}${path}`
		}
	}
}

const shares = new Map<string, Promise<string>>()

const methods: ShellMethods = {
	async getSession() {
		return {
			session: getCookie(sessionCookieName) ?? null,
			// Like the bridge, which only asks Prismic when one of these cookies exists.
			authenticated: Boolean(getCookie("is-logged-in")),
		}
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

	// Prismic requires an image name; screenshots are no longer uploaded. Unlike the bridge, sends no
	// CSRF token: Prismic no longer returns or checks one.
	const page = new URL(pageURL)
	const query = new URLSearchParams({
		sessionId: session,
		pageURL,
		title,
		imageName: `${page.pathname.slice(1)}${page.hash}${session}.jpg`,
	})
	const response = await fetch(`/previews/s?${query}`, { method: "POST" })
	if (!response.ok) throw new Error(`Prismic responded ${response.status} to the share request.`)

	const { url } = await response.json()
	if (typeof url !== "string" || !url) throw new Error("Prismic did not return a share link.")
	return url
}

addEventListener("message", ({ data, ports: [port] }) => {
	if (data?.type !== `${shellPrefix}connect` || !port) return

	port.onmessage = async ({ data }: MessageEvent<ShellRequest | null>) => {
		const method = data?.type?.slice(shellPrefix.length) as keyof ShellMethods
		if (!data?.type?.startsWith(shellPrefix) || !Object.hasOwn(methods, method)) return

		const response = { type: `${shellPrefix}response`, id: data.id }
		try {
			const handler = methods[method] as (...params: unknown[]) => unknown
			port.postMessage({ ...response, result: await handler(...data.params) })
		} catch (error) {
			port.postMessage({ ...response, error: (error as Error).message })
		}
	}
	port.postMessage({ type: `${shellPrefix}ready` })
})
