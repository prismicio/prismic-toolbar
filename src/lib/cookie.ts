// Reads and writes cookies like js-cookie 3: SDKs and servers parse these cookies, some with regular
// expressions, so their format must not change.

export interface CookieAttributes {
	/** `undefined` writes no `path`, so the browser uses the current one. */
	path: string | undefined
	domain?: string
	sameSite: "lax" | "none"
	secure?: true
}

/** Returns the first cookie whose decoded name matches, skipping those that fail to decode. */
export function getCookie(name: string): string | undefined {
	for (const cookie of document.cookie.split("; ")) {
		const [rawName = "", ...rest] = cookie.split("=")
		const value = rest.join("=")
		try {
			if (decodeURIComponent(rawName) !== name) continue
			const unquoted = value[0] === '"' ? value.slice(1, -1) : value
			return unquoted.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
		} catch {}
	}
}

/**
 * Writes a session cookie on `/` and reports whether the browser kept it: some writes drop
 * silently.
 */
export function setCookie(name: string, value: string): boolean {
	writeCookie(name, value, { path: "/", ...sameSiteAttributes() })
	return getCookie(name) === value
}

export function deleteCookie(
	name: string,
	attributes: CookieAttributes = { path: "/", ...sameSiteAttributes() },
): void {
	writeCookie(name, "", attributes, new Date(Date.now() - 864e5).toUTCString())
}

// Names are constants that need no encoding. Values keep the characters cookies allow unescaped.
function writeCookie(
	name: string,
	value: string,
	{ path, domain, sameSite, secure }: CookieAttributes,
	expires?: string,
) {
	const encoded = encodeURIComponent(value)
	let cookie = `${name}=${encoded.replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent)}`
	for (const [key, attribute] of Object.entries({ path, domain, sameSite, secure, expires })) {
		if (attribute === true) cookie += `; ${key}`
		// A `;` would start another attribute.
		else if (attribute) cookie += `; ${key}=${attribute.split(";")[0]}`
	}
	document.cookie = cookie
}

// Cookies written from a cross-site iframe need `SameSite=None; Secure`. Loopback hosts are secure
// contexts, so `Secure` also holds for a local dev server previewed from the hosted editor.
function sameSiteAttributes(): Pick<CookieAttributes, "sameSite" | "secure"> {
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
