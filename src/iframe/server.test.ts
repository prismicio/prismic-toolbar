import { describe, expect, it, vi } from "vitest"

import { createBridgeHandlers, loggedInCookieName, sessionCookieName } from "./server"

function setup(cookies: Record<string, string> = {}, responses: Record<string, unknown> = {}) {
	const jar = { ...cookies }
	const fetch = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
		const path = String(url).split("?")[0] as string
		if (!(path in responses)) return new Response("Not found", { status: 404 })
		return Response.json(responses[path])
	})
	const deleteSessionCookie = vi.fn(() => {
		delete jar[sessionCookieName]
	})
	const handlers = createBridgeHandlers({
		fetch: fetch as typeof globalThis.fetch,
		getCookie: (name) => jar[name],
		deleteSessionCookie,
	})
	return { handlers, fetch, jar, deleteSessionCookie }
}

const statePath = "/toolbar/state"
const previewState = {
	csrf: "csrf-token",
	isAuthenticated: true,
	previewState: { ref: "ref-1", title: "Spring launch", lastUpdate: 1 },
}

describe("getState", () => {
	it("skips the request without a session or sign-in cookie", async () => {
		const { handlers, fetch } = setup()
		await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: false })
		expect(fetch).not.toHaveBeenCalled()
	})

	it("reports the active preview without exposing the CSRF token", async () => {
		const { handlers, fetch } = setup(
			{ [sessionCookieName]: "session" },
			{ [statePath]: previewState },
		)
		await expect(handlers.getState()).resolves.toEqual({
			isAuthenticated: true,
			preview: { ref: "ref-1", title: "Spring launch" },
		})
		await handlers.getState()
		expect(fetch).toHaveBeenCalledOnce()
	})

	it("reports a signed-in user without a preview", async () => {
		const { handlers } = setup(
			{ [loggedInCookieName]: "true" },
			{ [statePath]: { isAuthenticated: true, previewState: null } },
		)
		await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: true })
	})

	it("retries after a failed request", async () => {
		const { handlers, fetch } = setup({ [sessionCookieName]: "session" })
		await expect(handlers.getState()).rejects.toThrow("/toolbar/state responded 404")
		await expect(handlers.getState()).rejects.toThrow()
		expect(fetch).toHaveBeenCalledTimes(2)
	})
})

describe("ping", () => {
	it("reports an ended session without a request when the session cookie is gone", async () => {
		const { handlers, fetch } = setup()
		await expect(handlers.ping("ref-1")).resolves.toEqual({ ref: null })
		expect(fetch).not.toHaveBeenCalled()
	})

	it("returns the session's ref, or null once Prismic closes it", async () => {
		const ping = "/previews/session/ping"
		const { handlers, fetch } = setup(
			{ [sessionCookieName]: "session" },
			{ [ping]: { ref: "ref-2", reload: true } },
		)
		await expect(handlers.ping("ref 1")).resolves.toEqual({ ref: "ref-2" })
		expect(fetch).toHaveBeenCalledWith("/previews/session/ping?ref=ref%201", undefined)

		const closed = setup(
			{ [sessionCookieName]: "session" },
			{ [ping]: { reload: false, close: true } },
		)
		await expect(closed.handlers.ping("ref-1")).resolves.toEqual({ ref: null })
	})

	it("shares one request between concurrent pings", async () => {
		const { handlers, fetch } = setup(
			{ [sessionCookieName]: "session" },
			{ "/previews/session/ping": { ref: "ref-1" } },
		)
		await Promise.all([handlers.ping("ref-1"), handlers.ping("ref-1")])
		expect(fetch).toHaveBeenCalledOnce()
	})
})

describe("closeSession", () => {
	it("deletes the session cookie and forgets the cached state", async () => {
		const { handlers, fetch, deleteSessionCookie } = setup(
			{ [sessionCookieName]: "session" },
			{ [statePath]: previewState },
		)
		await handlers.getState()
		await handlers.closeSession()
		expect(deleteSessionCookie).toHaveBeenCalledOnce()
		await expect(handlers.getState()).resolves.toEqual({ isAuthenticated: false })
		expect(fetch).toHaveBeenCalledOnce()
	})
})

describe("share", () => {
	it("creates one share link per page, without uploading a screenshot", async () => {
		const { handlers, fetch } = setup(
			{ [sessionCookieName]: "session" },
			{
				[statePath]: previewState,
				"/previews/s": { url: "https://share.link", hasPreviewImage: false },
			},
		)

		await expect(handlers.share("https://example.com/blog/post#intro")).resolves.toBe(
			"https://share.link",
		)
		await handlers.share("https://example.com/blog/post#intro")

		const shareCalls = fetch.mock.calls.filter(([url]) => String(url).startsWith("/previews/s?"))
		expect(shareCalls).toHaveLength(1)
		const [url, init] = shareCalls[0] as [string, RequestInit]
		expect(init).toEqual({ method: "POST" })
		expect(Object.fromEntries(new URL(url, "https://example.prismic.io").searchParams)).toEqual({
			sessionId: "session",
			pageURL: "https://example.com/blog/post#intro",
			title: "Spring launch",
			imageName: "blog/post#introsession.jpg",
			_: "csrf-token",
		})
	})

	it("fails without an active session and retries after a failure", async () => {
		const { handlers } = setup()
		await expect(handlers.share("https://example.com/")).rejects.toThrow(
			"No active preview session",
		)
		await expect(handlers.share("https://example.com/")).rejects.toThrow(
			"No active preview session",
		)
	})
})
