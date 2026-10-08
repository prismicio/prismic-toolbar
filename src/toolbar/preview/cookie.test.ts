import Cookies from "js-cookie"
import { afterEach, expect, it } from "vitest"

import { PreviewCookie } from "./cookie"

const cookieName = "io.prismic.preview"
const repository = "example.prismic.io"

afterEach(() => {
	Cookies.remove(cookieName, { path: "/" })
})

it.each([
	// A raw ref is converted silently when the page already shows it.
	["session-ref", false],
	["stale-ref", true],
	[undefined, true],
])("syncs a %s cookie to the session ref, asking for a reload: %s", (initial, reload) => {
	if (initial) Cookies.set(cookieName, initial, { path: "/" })

	expect(new PreviewCookie(false, repository).sync("session-ref")).toBe(reload)
	expect(JSON.parse(Cookies.get(cookieName) ?? "")).toEqual({
		[repository]: { preview: "session-ref" },
	})
})

it("adds a tracker when converting for an authenticated user", () => {
	Cookies.set(cookieName, "session-ref", { path: "/" })

	expect(new PreviewCookie(true, repository).sync("session-ref")).toBe(false)
	expect(JSON.parse(Cookies.get(cookieName) ?? "")).toEqual({
		_tracker: expect.stringMatching(/^[A-Za-z0-9]{8}$/),
		[repository]: { preview: "session-ref" },
	})
})
