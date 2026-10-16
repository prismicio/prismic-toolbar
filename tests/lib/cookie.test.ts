import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { deleteCookie, getCookie, setCookie } from "../../src/lib/cookie"

const topWindow = window.top
const initialLocation = window.location
const name = "io.prismic.preview"
const expired = "expires=Thu, 01 Jan 2026 03:04:05 GMT"

beforeEach(() => {
	vi.useFakeTimers({ now: new Date("2026-01-02T03:04:05Z"), toFake: ["Date"] })
})

afterEach(() => {
	Object.defineProperty(window, "top", { value: topWindow, configurable: true })
	Object.defineProperty(window, "location", { value: initialLocation, configurable: true })
})

/** Returns what `write` assigns to `document.cookie`, letting the writes through. */
function writes(write: () => void) {
	const set = vi.spyOn(document, "cookie", "set").mockClear()
	write()
	return set.mock.calls.map(([cookie]) => cookie)
}

// The strings js-cookie wrote: SDKs and servers parse them, some with regular expressions.
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
])("writes and deletes %s byte for byte", (_case, value, written) => {
	expect(writes(() => setCookie(name, value))).toEqual([written])
	expect(getCookie(name)).toBe(value)

	expect(writes(() => deleteCookie(name))).toEqual([`${name}=; path=/; sameSite=lax; ${expired}`])
	expect(getCookie(name)).toBeUndefined()
})

it("reports writes the browser drops", () => {
	vi.spyOn(document, "cookie", "set").mockImplementation(() => {})
	expect(setCookie(name, "value")).toBe(false)
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
	if (framed) Object.defineProperty(window, "top", { value: {}, configurable: true })
	Object.defineProperty(window, "location", { value: new URL(href), configurable: true })

	const written = writes(() => {
		setCookie(name, "value")
		deleteCookie(name)
	})
	expect(written).toEqual([
		`${name}=value; path=/; ${attributes}`,
		`${name}=; path=/; ${attributes}; ${expired}`,
	])
})

// SDKs and servers write this cookie too.
it.each([
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
])("reads %s", (_case, raw, value) => {
	document.cookie = `${name}=${raw}; path=/`
	expect(getCookie(name)).toBe(value)
})

it("reads the first cookie whose decoded name matches, skipping malformed ones", () => {
	document.cookie = "io%2Eprismic%2Epreview=%E0%A4%A; path=/"
	document.cookie = "io.prismic.preview=valid; path=/"
	expect(getCookie(name)).toBe("valid")

	document.cookie = "io%2Eprismic%2Epreview=encoded; path=/"
	// jsdom orders cookies by creation, which an overwrite keeps.
	expect(getCookie(name)).toBe(document.cookie.split("; ")[0]?.split("=")[1])
})
