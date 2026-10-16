// Reads and writes cookies like js-cookie 3 did: SDKs and servers read these cookies, some with
// regular expressions, so their format must not change.

export interface CookieAttributes {
	/** Omitted when `undefined`: the browser then uses the current path. */
	path: string | undefined
	domain?: string
	sameSite: "lax" | "none"
	secure?: true
}

/**
 * Returns the value of the first cookie whose decoded name matches, skipping cookies that fail to
 * decode.
 */
export function getCookie(name: string): string | undefined {
	for (const cookie of document.cookie.split("; ")) {
		const [encodedName = "", ...value] = cookie.split("=")
		try {
			if (decodeURIComponent(encodedName) === name) return decodeValue(value.join("="))
		} catch {
			// Malformed escape sequence.
		}
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

// Names are constants that need no encoding.
function writeCookie(name: string, value: string, attributes: CookieAttributes, expires?: string) {
	const { path, domain, sameSite, secure } = attributes
	let cookie = `${name}=${encodeValue(value)}`
	for (const [key, attribute] of Object.entries({ path, domain, sameSite, secure, expires })) {
		if (!attribute) continue
		// A `;` would start another attribute.
		cookie += attribute === true ? `; ${key}` : `; ${key}=${attribute.split(";")[0]}`
	}
	document.cookie = cookie
}

// Escapes like `encodeURIComponent`, except characters cookie values allow.
function encodeValue(value: string): string {
	return encodeURIComponent(value).replace(
		/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
		decodeURIComponent,
	)
}

function decodeValue(value: string): string {
	if (value[0] === '"') value = value.slice(1, -1)
	return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
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
