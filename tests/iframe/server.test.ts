import { describe, expect, it, vi } from "vitest"

import { createBridgeHandlers, sessionCookieName } from "../../src/iframe/server"
import { deleteCookie, getCookie, setCookie } from "../../src/lib/cookie"

/** Sets cookies on the repository host and answers Prismic requests by path. */
function setup(cookies: Record<string, string>, responses: Record<string, unknown> = {}) {
	for (const [name, value] of Object.entries(cookies)) setCookie(name, value)
	const fetch = vi.fn(async (url: string, _init?: RequestInit) => {
		const path = url.split("?")[0] as string
		if (!(path in responses)) return new Response("Not found", { status: 404 })
		return Response.json(responses[path])
	})
	vi.stubGlobal("fetch", fetch)
	return { handlers: createBridgeHandlers(), fetch }
}

const session = { [sessionCookieName]: "session" }
const statePath = "/toolbar/state"
const previewState = {
	csrf: "csrf-token",
	isAuthenticated: true,
	previewState: { ref: "ref-1", title: "Spring launch", lastUpdate: 1 },
}

describe("getState", () => {
	it("skips the request without a session or sign-in cookie", async () => {
		const { handlers, fetch } = setup({})
		await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: false })
		expect(fetch).not.toHaveBeenCalled()
	})

	it("reports the active preview, without exposing the CSRF token", async () => {
		const { handlers } = setup(session, { [statePath]: previewState })
		await expect(handlers.getState()).resolves.toEqual({
			isAuthenticated: true,
			preview: { ref: "ref-1", title: "Spring launch" },
		})
	})

	it("reports a session started after an earlier call found none", async () => {
		const responses: Record<string, unknown> = {
			[statePath]: { isAuthenticated: true, previewState: null },
		}
		const { handlers } = setup(session, responses)
		await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: true })

		responses[statePath] = previewState
		await expect(handlers.getState()).resolves.toEqual({
			isAuthenticated: true,
			preview: { ref: "ref-1", title: "Spring launch" },
		})
	})

	it("reports a signed-in user without a preview", async () => {
		const { handlers } = setup(
			{ "is-logged-in": "true" },
			{ [statePath]: { isAuthenticated: true, previewState: null } },
		)
		await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: true })
	})

	it("rejects when Prismic fails", async () => {
		const { handlers } = setup(session)
		await expect(handlers.getState()).rejects.toThrow("/toolbar/state responded 404")
	})
})

describe("ping", () => {
	const ping = "/previews/session/ping"

	it("reports an ended session without a request when the session cookie is gone", async () => {
		const { handlers, fetch } = setup({})
		await expect(handlers.ping("ref-1")).resolves.toEqual({ ref: null })
		expect(fetch).not.toHaveBeenCalled()
	})

	it("returns the session's ref, sharing one request between concurrent pings", async () => {
		const { handlers, fetch } = setup(session, { [ping]: { ref: "ref-2", reload: true } })
		const pings = await Promise.all([handlers.ping("ref 1"), handlers.ping("ref 1")])
		expect(pings).toEqual([{ ref: "ref-2" }, { ref: "ref-2" }])
		expect(fetch).toHaveBeenCalledExactlyOnceWith("/previews/session/ping?ref=ref%201", undefined)
	})

	it("returns null and closes the session once Prismic closes it", async () => {
		const { handlers } = setup(session, { [ping]: { reload: false, close: true } })
		await expect(handlers.ping("ref-1")).resolves.toEqual({ ref: null })
		expect(getCookie(sessionCookieName)).toBeUndefined()
	})

	it("ignores an answer for a session another tab replaced meanwhile", async () => {
		const { handlers, fetch } = setup(session)
		let answer = (_response: Response) => {}
		fetch.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))

		const pending = handlers.ping("ref-1")
		setCookie(sessionCookieName, "next-session")
		answer(Response.json({ reload: false, close: true }))

		await expect(pending).resolves.toEqual({ ref: "ref-1" })
		expect(getCookie(sessionCookieName)).toBe("next-session")
	})

	it("reports an ended session when another tab closed it meanwhile", async () => {
		const { handlers, fetch } = setup(session)
		let answer = (_response: Response) => {}
		fetch.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))

		const pending = handlers.ping("ref-1")
		deleteCookie(sessionCookieName)
		answer(Response.json({ ref: "ref-2", reload: true }))

		await expect(pending).resolves.toEqual({ ref: null })
	})
})

it("closes the session by deleting its cookie", async () => {
	const { handlers } = setup(session, { [statePath]: previewState })

	await handlers.closeSession()

	expect(getCookie(sessionCookieName)).toBeUndefined()
	await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: false })
})

it("deletes the session cookie on every domain and path that could hold it", async () => {
	const initialLocation = window.location
	Object.defineProperty(window, "location", {
		value: new URL("https://prismic.io/x;y"),
		configurable: true,
	})
	const set = vi.spyOn(document, "cookie", "set")

	try {
		await createBridgeHandlers().closeSession()
	} finally {
		Object.defineProperty(window, "location", { value: initialLocation, configurable: true })
	}

	expect(set.mock.calls.map(([cookie]) => cookie)).toMatchInlineSnapshot(`
		[
		  "io.prismic.previewSession=; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/x; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/x; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; domain=prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/; domain=prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/x; domain=prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/x; domain=prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; domain=.prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/; domain=.prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/x; domain=.prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		  "io.prismic.previewSession=; path=/x; domain=.prismic.io; sameSite=none; secure; expires=Thu, 01 Jan 1970 00:00:00 GMT",
		]
	`)
})

describe("share", () => {
	it("creates one share link per page, without uploading a screenshot", async () => {
		const { handlers, fetch } = setup(session, {
			[statePath]: previewState,
			"/previews/s": { url: "https://share.link", hasPreviewImage: false },
		})

		await expect(handlers.share("https://example.com/blog/post#intro")).resolves.toBe(
			"https://share.link",
		)
		await handlers.share("https://example.com/blog/post#intro")

		const shares = fetch.mock.calls.filter(([url]) => url.startsWith("/previews/s?"))
		expect(shares).toHaveLength(1)
		const [url, init] = shares[0] as [string, RequestInit]
		expect(init).toEqual({ method: "POST" })
		expect(Object.fromEntries(new URL(url, "https://example.prismic.io").searchParams)).toEqual({
			sessionId: "session",
			pageURL: "https://example.com/blog/post#intro",
			title: "Spring launch",
			imageName: "blog/post#introsession.jpg",
			_: "csrf-token",
		})
	})

	it("creates a new link for a later session on the same page", async () => {
		const responses: Record<string, unknown> = {
			[statePath]: previewState,
			"/previews/s": { url: "https://share.link/1", hasPreviewImage: false },
		}
		const { handlers } = setup(session, responses)
		await expect(handlers.share("https://example.com/")).resolves.toBe("https://share.link/1")

		await handlers.closeSession()
		setCookie(sessionCookieName, "later-session")
		responses["/previews/s"] = { url: "https://share.link/2", hasPreviewImage: false }
		await expect(handlers.share("https://example.com/")).resolves.toBe("https://share.link/2")
	})

	it("uses the current session's title and CSRF token", async () => {
		const responses: Record<string, unknown> = {
			[statePath]: previewState,
			"/previews/s": { url: "https://share.link", hasPreviewImage: false },
		}
		const { handlers, fetch } = setup(session, responses)
		await handlers.getState()
		responses[statePath] = {
			...previewState,
			csrf: "new-csrf-token",
			previewState: { ...previewState.previewState, title: "Summer launch" },
		}

		await handlers.share("https://example.com/")

		const [url] = fetch.mock.calls.find(([url]) => url.startsWith("/previews/s?")) as [string]
		expect(new URL(url, "https://example.prismic.io").searchParams.get("title")).toBe(
			"Summer launch",
		)
		expect(new URL(url, "https://example.prismic.io").searchParams.get("_")).toBe("new-csrf-token")
	})

	it("fails without an active session, and retries after a failure", async () => {
		const { handlers } = setup({})
		await expect(handlers.share("https://example.com/")).rejects.toThrow(
			"No active preview session",
		)
		await expect(handlers.share("https://example.com/")).rejects.toThrow(
			"No active preview session",
		)
	})
})
