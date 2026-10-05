import Cookies from "js-cookie"
import { afterEach, describe, expect, it } from "vitest"

import {
	createSiteCookieStore,
	parseSiteCookie,
	previewCookieName,
	refFor,
	serializeSiteCookie,
} from "./site-cookie"

const repository = "example.prismic.io"
const otherRepository = "other.prismic.io"

const storedJSON = () => JSON.parse(Cookies.get(previewCookieName) ?? "null")

afterEach(() => {
	Cookies.remove(previewCookieName, { path: "/" })
})

describe("parseSiteCookie", () => {
	it("reads a missing cookie as none", () => {
		expect(parseSiteCookie(undefined)).toEqual({ kind: "none" })
		expect(parseSiteCookie("")).toEqual({ kind: "none" })
	})

	it("reads raw refs as plain, including values that parse as non-object JSON", () => {
		const ref = "https://example.prismic.io/previews/abc:123?websitePreviewId=xyz"
		expect(parseSiteCookie(ref)).toEqual({ kind: "plain", raw: ref })
		expect(parseSiteCookie("42")).toEqual({ kind: "plain", raw: "42" })
	})

	it("reads the toolbar's JSON format", () => {
		const raw = JSON.stringify({
			_tracker: "abcd1234",
			[repository]: { preview: "ref-1" },
			[otherRepository]: { preview: "ref-2" },
			ignored: { notPreview: true },
		})
		expect(parseSiteCookie(raw)).toEqual({
			kind: "json",
			raw,
			tracker: "abcd1234",
			refs: { [repository]: "ref-1", [otherRepository]: "ref-2" },
		})
	})
})

describe("refFor", () => {
	it("returns a plain cookie's ref for any repository", () => {
		expect(refFor({ kind: "plain", raw: "ref" }, repository)).toBe("ref")
	})

	it("returns only the repository's own ref from a JSON cookie", () => {
		const cookie = parseSiteCookie(JSON.stringify({ [otherRepository]: { preview: "ref" } }))
		expect(refFor(cookie, repository)).toBeUndefined()
		expect(refFor(cookie, otherRepository)).toBe("ref")
	})

	it("treats a tracker-only cookie as inactive", () => {
		expect(refFor(parseSiteCookie('{"_tracker":"abcd1234"}'), repository)).toBeUndefined()
	})
})

describe("serializeSiteCookie", () => {
	it("puts the tracker first so SDKs find the repository key after it", () => {
		expect(serializeSiteCookie({ tracker: "abcd1234", refs: { [repository]: "ref" } })).toBe(
			`{"_tracker":"abcd1234","${repository}":{"preview":"ref"}}`,
		)
	})

	it("returns undefined without refs", () => {
		expect(serializeSiteCookie({ tracker: "abcd1234", refs: {} })).toBeUndefined()
	})
})

describe("site cookie store", () => {
	const store = createSiteCookieStore(repository)

	it("writes plain refs as they are", () => {
		expect(store.writeRef("ref", { codec: "plain", authenticated: true })).toBe(true)
		expect(Cookies.get(previewCookieName)).toBe("ref")
	})

	it("writes JSON with a new tracker for authenticated users only", () => {
		store.writeRef("ref-1", { codec: "json", authenticated: true })
		const first = storedJSON()
		expect(first).toEqual({
			_tracker: expect.stringMatching(/^[A-Za-z0-9]{8}$/),
			[repository]: { preview: "ref-1" },
		})

		store.writeRef("ref-2", { codec: "json", authenticated: true })
		expect(storedJSON()._tracker).not.toBe(first._tracker)

		store.writeRef("ref-3", { codec: "json", authenticated: false })
		expect(storedJSON()).toEqual({ [repository]: { preview: "ref-3" } })
	})

	it("keeps other repositories' refs and replaces a plain cookie", () => {
		Cookies.set(previewCookieName, JSON.stringify({ [otherRepository]: { preview: "other" } }))
		store.writeRef("mine", { codec: "json", authenticated: false })
		expect(storedJSON()).toEqual({
			[otherRepository]: { preview: "other" },
			[repository]: { preview: "mine" },
		})

		Cookies.set(previewCookieName, "raw-ref")
		store.writeRef("mine", { codec: "json", authenticated: false })
		expect(storedJSON()).toEqual({ [repository]: { preview: "mine" } })
	})

	it("removes only its own ref", () => {
		Cookies.set(
			previewCookieName,
			JSON.stringify({
				_tracker: "abcd1234",
				[otherRepository]: { preview: "other" },
				[repository]: { preview: "mine" },
			}),
		)
		store.removeOwn()
		expect(storedJSON()).toEqual({ _tracker: "abcd1234", [otherRepository]: { preview: "other" } })

		Cookies.set(
			previewCookieName,
			JSON.stringify({ _tracker: "x", [repository]: { preview: "a" } }),
		)
		store.removeOwn()
		expect(Cookies.get(previewCookieName)).toBeUndefined()

		Cookies.set(previewCookieName, "raw-ref")
		store.removeOwn()
		expect(Cookies.get(previewCookieName)).toBeUndefined()
	})
})
