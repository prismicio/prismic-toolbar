import Cookies from "js-cookie"

/**
 * Writes a session cookie on `/` and reports whether the browser kept it: some writes drop
 * silently.
 */
export function setCookie(name: string, value: string): boolean {
	Cookies.set(name, value, { path: "/", ...sameSiteAttributes() })
	return Cookies.get(name) === value
}

export function deleteCookie(name: string): void {
	Cookies.remove(name, { path: "/", ...sameSiteAttributes() })
}

// Cookies written from a cross-site iframe need `SameSite=None; Secure`. Loopback hosts are secure
// contexts, so `Secure` also holds for a local dev server previewed from the hosted editor.
function sameSiteAttributes(): Cookies.CookieAttributes {
	const { protocol, hostname } = window.location
	const trustworthy =
		protocol === "https:" ||
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname === "127.0.0.1" ||
		hostname === "[::1]"

	if (window.self !== window.top && trustworthy) return { sameSite: "none", secure: true }
	return { sameSite: "lax" }
}
