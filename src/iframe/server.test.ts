import Cookies from "js-cookie"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createBridgeHandlers, sessionCookieName } from "./server"

afterEach(() => {
	for (const name of Object.keys(Cookies.get())) Cookies.remove(name, { path: "/" })
	vi.unstubAllGlobals()
})

/** Sets cookies on the repository host and answers Prismic requests by path. */
function setup(cookies: Record<string, string>, responses: Record<string, unknown> = {}) {
	for (const [name, value] of Object.entries(cookies)) Cookies.set(name, value, { path: "/" })
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

	it("reports the active preview once, without exposing the CSRF token", async () => {
		const { handlers, fetch } = setup(session, { [statePath]: previewState })
		await expect(handlers.getState()).resolves.toEqual({
			isAuthenticated: true,
			preview: { ref: "ref-1", title: "Spring launch" },
		})
		await handlers.getState()
		expect(fetch).toHaveBeenCalledOnce()
	})

	it("reports a signed-in user without a preview", async () => {
		const { handlers } = setup(
			{ "is-logged-in": "true" },
			{ [statePath]: { isAuthenticated: true, previewState: null } },
		)
		await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: true })
	})

	it("retries after a failed request", async () => {
		const { handlers, fetch } = setup(session)
		await expect(handlers.getState()).rejects.toThrow("/toolbar/state responded 404")
		await expect(handlers.getState()).rejects.toThrow()
		expect(fetch).toHaveBeenCalledTimes(2)
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

	it("returns null once Prismic closes the session", async () => {
		const { handlers } = setup(session, { [ping]: { reload: false, close: true } })
		await expect(handlers.ping("ref-1")).resolves.toEqual({ ref: null })
	})
})

it("closes the session by deleting its cookie and forgets the cached state", async () => {
	const { handlers, fetch } = setup(session, { [statePath]: previewState })

	await handlers.getState()
	await handlers.closeSession()

	expect(Cookies.get(sessionCookieName)).toBeUndefined()
	await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: false })
	expect(fetch).toHaveBeenCalledOnce()
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
