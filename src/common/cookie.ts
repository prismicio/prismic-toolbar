import Cookies from "js-cookie"

type CookieAttributes = Cookies.CookieAttributes

export function getCookie(name: string) {
	return Cookies.get(name) // or undefined
}

export function setCookie(name: string, value: string | object, expires = Infinity /* days */) {
	const path = "/"
	const cookieValue = typeof value === "string" ? value : JSON.stringify(value)
	return Cookies.set(name, cookieValue, {
		path,
		expires,
		...getSameSiteAttributes(),
	})
}

export function deleteCookie(name: string) {
	const path = "/"
	Cookies.remove(name, { path, ...getSameSiteAttributes() })
}

// TODO remove after we force no /preview route (url prediction)
export function demolishCookie(name: string, options: CookieAttributes = {}) {
	const subdomains = window.location.hostname.split(".") // ['www','gosport','com']
	const subpaths = window.location.pathname.slice(1).split("/") // ['my','path']

	const DOMAINS: (string | undefined)[] = ([] as (string | undefined)[])
		.concat(subdomains.map((sub, idx) => `${subdomains.slice(idx).join(".")}`)) // www.gosport.com
		.concat(subdomains.map((sub, idx) => `.${subdomains.slice(idx).join(".")}`)) // .gosport.com
		.concat(undefined) // no domain specified

	const PATHS: (string | undefined)[] = ([] as (string | undefined)[])
		.concat(subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join("/")}`)) // /a/b/foo
		.concat(subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join("/")}/`)) // /a/b/foo/
		.concat("/") // root path
		.concat(undefined) // no path specified

	DOMAINS.forEach((domain) =>
		PATHS.forEach((path) =>
			Cookies.remove(name, { ...getSameSiteAttributes(), ...options, domain, path }),
		),
	)
}

// Loopback hosts are secure contexts, so `Secure` cookies hold there over plain http. A local dev
// server in a cross-site iframe would otherwise write `SameSite=Lax`, which the browser drops.
function isPotentiallyTrustworthy(): boolean {
	const { protocol, hostname } = window.location
	return (
		protocol === "https:" ||
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname === "127.0.0.1" ||
		hostname === "[::1]"
	)
}

function getSameSiteAttributes(): CookieAttributes {
	if (window.self !== window.top && isPotentiallyTrustworthy()) {
		return { sameSite: "none", secure: true }
	}

	return { sameSite: "lax" }
}
