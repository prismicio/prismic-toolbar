import Cookies from "js-cookie"
import { afterEach, describe, expect, it } from "vitest"

import { PreviewCookie } from "./cookie"

const cookieName = "io.prismic.preview"
const repository = "example.prismic.io"

const storedCookie = () => JSON.parse(Cookies.get(cookieName) ?? "null")

afterEach(() => {
	Cookies.remove(cookieName, { path: "/" })
})

describe("PreviewCookie.sync", () => {
	it("converts a legacy cookie silently when it already holds the session ref", () => {
		Cookies.set(cookieName, "session-ref", { path: "/" })

		expect(new PreviewCookie(false, repository).sync("session-ref")).toBe(false)
		expect(storedCookie()).toEqual({ [repository]: { preview: "session-ref" } })
	})

	it("asks for a reload when a legacy cookie holds another ref", () => {
		Cookies.set(cookieName, "stale-ref", { path: "/" })

		expect(new PreviewCookie(false, repository).sync("session-ref")).toBe(true)
		expect(storedCookie()).toEqual({ [repository]: { preview: "session-ref" } })
	})

	it("adds a tracker when converting for an authenticated user", () => {
		Cookies.set(cookieName, "session-ref", { path: "/" })

		expect(new PreviewCookie(true, repository).sync("session-ref")).toBe(false)
		expect(storedCookie()).toEqual({
			_tracker: expect.stringMatching(/^[A-Za-z0-9]{8}$/),
			[repository]: { preview: "session-ref" },
		})
	})

	it("asks for a reload when no cookie exists yet", () => {
		expect(new PreviewCookie(false, repository).sync("session-ref")).toBe(true)
		expect(storedCookie()).toEqual({ [repository]: { preview: "session-ref" } })
	})
})
