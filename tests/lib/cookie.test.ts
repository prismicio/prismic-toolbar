import { afterEach, expect, it, vi } from "vitest"

import { deleteCookie, setCookie } from "../../src/lib/cookie"
import { createSiteCookieStore, previewCookieName } from "../../src/lib/site-cookie"

const topWindow = window.top
const initialLocation = window.location

afterEach(() => {
	Object.defineProperty(window, "top", { value: topWindow, configurable: true })
	Object.defineProperty(window, "location", { value: initialLocation, configurable: true })
})

/** Records what is written to `document.cookie`, still letting the writes through. */
function recordWrites() {
	const set = vi.spyOn(document, "cookie", "set")
	return () => set.mock.calls.map(([cookie]) => cookie)
}

/** The preview cookie's value as the toolbar reads it. */
function readPreviewCookie() {
	const cookie = createSiteCookieStore("repo.cdn.prismic.io").read()
	return cookie.kind === "none" ? undefined : cookie.raw
}

it("stores a session cookie, reports whether the browser kept it, and deletes it", () => {
	expect(setCookie(previewCookieName, "value")).toBe(true)
	expect(readPreviewCookie()).toBe("value")
	deleteCookie(previewCookieName)
	expect(readPreviewCookie()).toBeUndefined()

	vi.spyOn(document, "cookie", "set").mockImplementation(() => {})
	expect(setCookie(previewCookieName, "value")).toBe(false)
})

// SDKs and servers read these cookies, some with regular expressions: their format must not change.
it.each([
	["a plain ref", "ref-1", "io.prismic.preview=ref-1; path=/; sameSite=lax"],
	[
		"a ref URL",
		"https://repo.prismic.io/previews/abc:def?websitePreviewId=xyz",
		"io.prismic.preview=https://repo.prismic.io/previews/abc:def?websitePreviewId=xyz; path=/; sameSite=lax",
	],
	[
		"a JSON preview cookie",
		JSON.stringify({
			_tracker: "Ab3dEf9h",
			"repo.cdn.prismic.io": { preview: "https://repo.prismic.io/previews/a:b?c=1&d=2" },
			"other.cdn.prismic.io": { preview: "spaced ref, 100% ~{}[]@#$+;|^`<>\"'é" },
		}),
		"io.prismic.preview={%22_tracker%22:%22Ab3dEf9h%22%2C%22repo.cdn.prismic.io%22:{%22preview%22:%22https://repo.prismic.io/previews/a:b?c=1&d=2%22}%2C%22other.cdn.prismic.io%22:{%22preview%22:%22spaced%20ref%2C%20100%25%20~{}[]@#$+%3B|^`<>%5C%22'%C3%A9%22}}; path=/; sameSite=lax",
	],
])("writes %s byte for byte", (_name, value, written) => {
	const writes = recordWrites()

	expect(setCookie(previewCookieName, value)).toBe(true)

	expect(writes()).toEqual([written])
	expect(readPreviewCookie()).toBe(value)
})

it("deletes cookies byte for byte", () => {
	vi.useFakeTimers({ now: new Date("2026-01-02T03:04:05Z"), toFake: ["Date"] })
	setCookie(previewCookieName, "ref-1")
	const writes = recordWrites()

	deleteCookie(previewCookieName)

	expect(writes()).toEqual([
		"io.prismic.preview=; path=/; sameSite=lax; expires=Thu, 01 Jan 2026 03:04:05 GMT",
	])
	expect(readPreviewCookie()).toBeUndefined()
})

const crossSite = "sameSite=none; secure"

it.each([
	["https://example.com/", false, "sameSite=lax"],
	["https://example.com/", true, crossSite],
	// Loopback is a secure context, so `Secure` holds over plain http where `Lax` would be dropped.
	["http://localhost:3000/", true, crossSite],
	["http://app.localhost:3000/", true, crossSite],
	["http://127.0.0.1:3000/", true, crossSite],
	["http://[::1]:3000/", true, crossSite],
	["http://example.com/", true, "sameSite=lax"],
	["http://localhost.example.com/", true, "sameSite=lax"],
])("writes cookies on %s (framed: %s) with %s", (href, framed, attributes) => {
	vi.useFakeTimers({ now: new Date("2026-01-02T03:04:05Z"), toFake: ["Date"] })
	if (framed) Object.defineProperty(window, "top", { value: {}, configurable: true })
	Object.defineProperty(window, "location", { value: new URL(href), configurable: true })
	const writes = recordWrites()

	setCookie("toolbar-test", "value")
	deleteCookie("toolbar-test")

	expect(writes()).toEqual([
		`toolbar-test=value; path=/; ${attributes}`,
		`toolbar-test=; path=/; ${attributes}; expires=Thu, 01 Jan 2026 03:04:05 GMT`,
	])
})

// Older toolbars, SDKs, and servers write this cookie too.
it.each([
	["a plain ref", "ref-1", "ref-1"],
	[
		"JSON encoded by js-cookie",
		"{%22_tracker%22:%22Ab3dEf9h%22%2C%22repo.cdn.prismic.io%22:{%22preview%22:%22https://repo.prismic.io/previews/a:b?c=1%22}}",
		'{"_tracker":"Ab3dEf9h","repo.cdn.prismic.io":{"preview":"https://repo.prismic.io/previews/a:b?c=1"}}',
	],
	[
		"JSON encoded with encodeURIComponent",
		"%7B%22repo.cdn.prismic.io%22%3A%7B%22preview%22%3A%22https%3A%2F%2Frepo.prismic.io%2Fpreviews%2Fa%22%7D%7D",
		'{"repo.cdn.prismic.io":{"preview":"https://repo.prismic.io/previews/a"}}',
	],
	[
		"lowercase escapes",
		"https%3a%2f%2frepo.prismic.io%2fpreviews%2fa",
		"https://repo.prismic.io/previews/a",
	],
	[
		"raw JSON",
		'{"repo.cdn.prismic.io":{"preview":"ref-1"}}',
		'{"repo.cdn.prismic.io":{"preview":"ref-1"}}',
	],
	["a quoted value", '"ref-1"', "ref-1"],
	["a value with equal signs", "a=b=c", "a=b=c"],
	["a lone percent sign", "100%", "100%"],
	["a malformed escape", "%E0%A4%A", undefined],
])("reads %s", (_name, raw, value) => {
	document.cookie = `${previewCookieName}=${raw}; path=/`

	expect(readPreviewCookie()).toBe(value)
})

it("reads the first cookie whose decoded name matches, skipping malformed ones", () => {
	document.cookie = "io%2Eprismic%2Epreview=%E0%A4%A; path=/"
	document.cookie = "io.prismic.preview=valid; path=/"
	expect(readPreviewCookie()).toBe("valid")

	document.cookie = "io%2Eprismic%2Epreview=encoded; path=/"
	const first = document.cookie.split("; ")[0]?.split("=")[1]
	expect(readPreviewCookie()).toBe(first)
})
