import Cookies from "js-cookie"
import { afterEach, expect, it, vi } from "vitest"

import { setCookie } from "./cookie"

const topWindow = window.top

afterEach(() => {
	Object.defineProperty(window, "top", { value: topWindow, configurable: true })
})

const crossSite = { sameSite: "none", secure: true }

it.each([
	["https://example.com/", false, { sameSite: "lax" }],
	["https://example.com/", true, crossSite],
	// Loopback is a secure context, so `Secure` holds over plain http where `Lax` would be dropped.
	["http://localhost:3000/", true, crossSite],
	["http://app.localhost:3000/", true, crossSite],
	["http://127.0.0.1:3000/", true, crossSite],
	["http://example.com/", true, { sameSite: "lax" }],
])("writes cookies on %s (framed: %s) with %o", (href, framed, attributes) => {
	vi.spyOn(Cookies, "set").mockReturnValue(undefined)
	if (framed) Object.defineProperty(window, "top", { value: {}, configurable: true })
	Object.defineProperty(window, "location", { value: new URL(href), configurable: true })

	setCookie("io.prismic.preview", "ref")

	expect(Cookies.set).toHaveBeenCalledWith(
		"io.prismic.preview",
		"ref",
		expect.objectContaining(attributes),
	)
})
