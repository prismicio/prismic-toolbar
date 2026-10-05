import Cookies from "js-cookie"

type CookieAttributes = Cookies.CookieAttributes

/** Reads a cookie, or `undefined` when it is absent. */
export function getCookie(name: string): string | undefined {
	return Cookies.get(name)
}

/**
 * Writes a session cookie on `/` and reports whether the browser kept it. Browsers drop some writes
 * silently, for example a `SameSite=Lax` cookie written from a cross-site iframe.
 */
export function setCookie(name: string, value: string): boolean {
	Cookies.set(name, value, { path: "/", ...sameSiteAttributes() })
	return Cookies.get(name) === value
}

export function deleteCookie(name: string): void {
	Cookies.remove(name, { path: "/", ...sameSiteAttributes() })
}

/**
 * Deletes a cookie for every domain and path it could have been written with on this page. The
 * repository session cookie is written by Prismic, so its exact attributes are unknown here.
 */
export function deleteCookieEverywhere(name: string, attributes: CookieAttributes = {}): void {
	const hostnameParts = window.location.hostname.split(".")
	const pathParts = window.location.pathname.slice(1).split("/")

	const domains = [
		...hostnameParts.map((_, index) => hostnameParts.slice(index).join(".")),
		...hostnameParts.map((_, index) => `.${hostnameParts.slice(index).join(".")}`),
		undefined,
	]
	const paths = [
		...pathParts.map((_, index) => `/${pathParts.slice(0, index + 1).join("/")}`),
		...pathParts.map((_, index) => `/${pathParts.slice(0, index + 1).join("/")}/`),
		"/",
		undefined,
	]

	for (const domain of domains) {
		for (const path of paths) Cookies.remove(name, { ...attributes, domain, path })
	}
}

/**
 * Cookies written from a cross-site iframe need `SameSite=None; Secure`. Browsers accept `Secure`
 * on potentially trustworthy origins, which include loopback hosts over plain http, so a local dev
 * server previewed from the hosted editor keeps its cookies.
 */
function sameSiteAttributes(): CookieAttributes {
	if (window.self !== window.top && isPotentiallyTrustworthy(window.location)) {
		return { sameSite: "none", secure: true }
	}

	return { sameSite: "lax" }
}

export function isPotentiallyTrustworthy({
	protocol,
	hostname,
}: Pick<Location, "protocol" | "hostname">): boolean {
	if (protocol === "https:") return true

	return (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname === "127.0.0.1" ||
		hostname === "[::1]"
	)
}
