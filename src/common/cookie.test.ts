import Cookies from "js-cookie"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setCookie } from "./cookie"

const topWindow = window.top

function framedOn(href: string) {
	// A cross-site iframe is the only context that needs the relaxed attributes,
	// so both halves have to be faked: the framing and the origin.
	Object.defineProperty(window, "top", { value: {}, configurable: true })
	Object.defineProperty(window, "location", { value: new URL(href), configurable: true })
}

describe("setCookie", () => {
	beforeEach(() => {
		vi.spyOn(Cookies, "set").mockReturnValue(undefined)
	})

	afterEach(() => {
		Object.defineProperty(window, "top", { value: topWindow, configurable: true })
	})

	it("keeps cookies same-site at the top level", () => {
		Object.defineProperty(window, "location", {
			value: new URL("https://example.com/"),
			configurable: true,
		})

		setCookie("io.prismic.preview", "ref")

		expect(Cookies.set).toHaveBeenCalledWith(
			"io.prismic.preview",
			"ref",
			expect.objectContaining({ sameSite: "lax" }),
		)
	})

	it.each([
		"https://example.com/",
		// Loopback is a secure context, so `Secure` is honoured over plain http.
		// Sending `Lax` here instead makes the browser drop the write silently.
		"http://localhost:3000/",
		"http://app.localhost:3000/",
		"http://127.0.0.1:3000/",
	])("allows cookies to cross into an iframe on %s", (href) => {
		framedOn(href)

		setCookie("io.prismic.preview", "ref")

		expect(Cookies.set).toHaveBeenCalledWith(
			"io.prismic.preview",
			"ref",
			expect.objectContaining({ sameSite: "none", secure: true }),
		)
	})

	it("keeps cookies same-site in an iframe on a plain http origin", () => {
		framedOn("http://example.com/")

		setCookie("io.prismic.preview", "ref")

		expect(Cookies.set).toHaveBeenCalledWith(
			"io.prismic.preview",
			"ref",
			expect.objectContaining({ sameSite: "lax" }),
		)
	})
})
