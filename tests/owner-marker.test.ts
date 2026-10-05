import Cookies from "js-cookie"
import { describe, expect, it } from "vitest"

import {
	claimOwnership,
	liveOwner,
	ownerCookieName,
	readOwner,
	releaseOwnership,
} from "../src/core/owner-marker"
import { parseSiteCookie } from "../src/core/site-cookie"

describe("owner marker", () => {
	it("round-trips a claim and its release", () => {
		claimOwnership("example.prismic.io", "editor-ref", 1000)
		expect(readOwner()).toEqual({
			version: 2,
			repository: "example.prismic.io",
			ref: "editor-ref",
			at: 1000,
		})
		releaseOwnership()
		expect(readOwner()).toBeUndefined()
	})

	it.each([
		"not json",
		"null",
		JSON.stringify({ version: 1, repository: "example.prismic.io", ref: "ref", at: 1 }),
		JSON.stringify({ version: 2, repository: "", ref: "ref", at: 1 }),
		JSON.stringify({ version: 2, repository: "example.prismic.io", ref: "", at: 1 }),
		// Markers without a timestamp come from unreleased builds of #131.
		JSON.stringify({ version: 2, repository: "example.prismic.io", ref: "ref" }),
	])("ignores malformed markers: %s", (value) => {
		Cookies.set(ownerCookieName, value)
		expect(readOwner()).toBeUndefined()
	})

	it("is live only while the preview cookie holds the claimed ref", () => {
		claimOwnership("example.prismic.io", "editor-ref", 1000)
		expect(liveOwner(parseSiteCookie("editor-ref"))?.ref).toBe("editor-ref")
		expect(liveOwner(parseSiteCookie("share-link-ref"))).toBeUndefined()
		expect(liveOwner(parseSiteCookie(undefined))).toBeUndefined()
		expect(
			liveOwner(
				parseSiteCookie(JSON.stringify({ "example.prismic.io": { preview: "editor-ref" } })),
			),
		).toBeUndefined()
	})
})
