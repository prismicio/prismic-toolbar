import Cookies from "js-cookie"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { deleteCookie, getCookie, isPotentiallyTrustworthy, setCookie } from "./cookie"

const topWindow = window.top
const initialLocation = window.location

function frameOn(href: string) {
	// Only a cross-site iframe needs relaxed attributes, so fake both the framing and the origin.
	Object.defineProperty(window, "top", { value: {}, configurable: true })
	Object.defineProperty(window, "location", { value: new URL(href), configurable: true })
}

afterEach(() => {
	Object.defineProperty(window, "top", { value: topWindow, configurable: true })
	Object.defineProperty(window, "location", { value: initialLocation, configurable: true })
	Cookies.remove("toolbar-test", { path: "/" })
})

describe("setCookie", () => {
	it("stores a session cookie and reports that the browser kept it", () => {
		expect(setCookie("toolbar-test", "value")).toBe(true)
		expect(getCookie("toolbar-test")).toBe("value")
		deleteCookie("toolbar-test")
		expect(getCookie("toolbar-test")).toBeUndefined()
	})

	it("reports a write the browser dropped", () => {
		vi.spyOn(Cookies, "set").mockReturnValue(undefined)
		expect(setCookie("toolbar-test", "value")).toBe(false)
	})
})

describe("cookie attributes", () => {
	beforeEach(() => {
		vi.spyOn(Cookies, "set").mockReturnValue(undefined)
	})

	it("keeps cookies same-site at the top level", () => {
		setCookie("toolbar-test", "value")
		expect(Cookies.set).toHaveBeenCalledWith(
			"toolbar-test",
			"value",
			expect.objectContaining({ path: "/", sameSite: "lax" }),
		)
	})

	it.each([
		"https://example.com/",
		// Loopback is a secure context, so `Secure` holds over plain http. `Lax` would be dropped.
		"http://localhost:3000/",
		"http://app.localhost:3000/",
		"http://127.0.0.1:3000/",
		"http://[::1]:3000/",
	])("lets cookies cross into an iframe on %s", (href) => {
		frameOn(href)
		setCookie("toolbar-test", "value")
		expect(Cookies.set).toHaveBeenCalledWith(
			"toolbar-test",
			"value",
			expect.objectContaining({ sameSite: "none", secure: true }),
		)
	})

	it("keeps cookies same-site in an iframe on a plain http host", () => {
		frameOn("http://example.com/")
		setCookie("toolbar-test", "value")
		expect(Cookies.set).toHaveBeenCalledWith(
			"toolbar-test",
			"value",
			expect.objectContaining({ sameSite: "lax" }),
		)
	})
})

describe("isPotentiallyTrustworthy", () => {
	it.each([
		["https:", "example.com", true],
		["http:", "localhost", true],
		["http:", "preview.localhost", true],
		["http:", "127.0.0.1", true],
		["http:", "[::1]", true],
		["http:", "example.com", false],
		["http:", "localhost.example.com", false],
	])("%s//%s → %s", (protocol, hostname, expected) => {
		expect(isPotentiallyTrustworthy({ protocol, hostname })).toBe(expected)
	})
})
