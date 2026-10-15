import Cookies from "js-cookie"
import { afterEach, expect, it, vi } from "vitest"

import { deleteCookie, setCookie } from "../../src/lib/cookie"

const topWindow = window.top
const initialLocation = window.location

afterEach(() => {
	Object.defineProperty(window, "top", { value: topWindow, configurable: true })
	Object.defineProperty(window, "location", { value: initialLocation, configurable: true })
})

it("stores a session cookie, reports whether the browser kept it, and deletes it", () => {
	expect(setCookie("toolbar-test", "value")).toBe(true)
	expect(Cookies.get("toolbar-test")).toBe("value")
	deleteCookie("toolbar-test")
	expect(Cookies.get("toolbar-test")).toBeUndefined()

	vi.spyOn(Cookies, "set").mockReturnValue(undefined)
	expect(setCookie("toolbar-test", "value")).toBe(false)
})

const crossSite = { sameSite: "none", secure: true }

it.each([
	["https://example.com/", false, { sameSite: "lax" }],
	["https://example.com/", true, crossSite],
	// Loopback is a secure context, so `Secure` holds over plain http where `Lax` would be dropped.
	["http://localhost:3000/", true, crossSite],
	["http://app.localhost:3000/", true, crossSite],
	["http://127.0.0.1:3000/", true, crossSite],
	["http://[::1]:3000/", true, crossSite],
	["http://example.com/", true, { sameSite: "lax" }],
	["http://localhost.example.com/", true, { sameSite: "lax" }],
])("writes cookies on %s (framed: %s) with %o", (href, framed, attributes) => {
	vi.spyOn(Cookies, "set").mockReturnValue(undefined)
	if (framed) Object.defineProperty(window, "top", { value: {}, configurable: true })
	Object.defineProperty(window, "location", { value: new URL(href), configurable: true })

	setCookie("toolbar-test", "value")

	expect(Cookies.set).toHaveBeenCalledWith(
		"toolbar-test",
		"value",
		expect.objectContaining({ path: "/", ...attributes }),
	)
})
