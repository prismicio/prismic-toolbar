import Cookies from "js-cookie"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Bridge } from "../../src/lib/bridge"
import type { BridgeState } from "../../src/lib/bridge-protocol"
import { claimOwnership, readOwner } from "../../src/lib/owner-marker"
import {
	createPreviewSession,
	type PreviewSession,
	type PreviewSessionOptions,
} from "../../src/lib/preview-session"
import { createSiteCookieStore, previewCookieName } from "../../src/lib/site-cookie"

const repository = "example.prismic.io"
const otherRepository = "other.prismic.io"
const navigationStart = 10_000

let events: [string, string | null][]
let cancelEvents: boolean
const recordEvent = (event: Event) => {
	events.push([event.type, (event as CustomEvent<{ ref: string } | null>).detail?.ref ?? null])
	if (cancelEvents) event.preventDefault()
}
const eventTypes = ["prismicPreviewStart", "prismicPreviewUpdate", "prismicPreviewEnd"]
const sessions: PreviewSession[] = []

beforeEach(() => {
	vi.useFakeTimers()
	// Editor pushes in these tests happen around the page load.
	vi.setSystemTime(navigationStart)
	Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
	events = []
	cancelEvents = false
	for (const type of eventTypes) window.addEventListener(type, recordEvent)
})

afterEach(() => {
	for (const session of sessions.splice(0)) session.dispose()
	for (const type of eventTypes) window.removeEventListener(type, recordEvent)
})

function fakeBridge(state: BridgeState) {
	const server = { ref: state.preview?.ref ?? (null as string | null) }
	const bridge = {
		getState: vi.fn(async () => state),
		ping: vi.fn(async () => ({ ref: server.ref })),
		closeSession: vi.fn(async () => {}),
		share: vi.fn(async (pageURL: string) => `https://example.prismic.io/previews/s/${pageURL}`),
		dispose: vi.fn(),
	} satisfies Bridge
	return { bridge, server }
}

function setup(state: BridgeState, options: Partial<PreviewSessionOptions> = {}) {
	const { bridge, server } = fakeBridge(state)
	const reload = vi.fn()
	const session = createPreviewSession({
		repositoryHost: repository,
		codec: "json",
		watchCookie: true,
		connect: async () => bridge,
		reload,
		navigationStart,
		...options,
	})
	sessions.push(session)
	return { session, bridge, server, reload }
}

const active = (ref: string, isAuthenticated = false): BridgeState => ({
	isAuthenticated,
	preview: { ref, title: "Spring launch" },
})
const jsonCookie = (refs: Record<string, string>, tracker?: string) =>
	JSON.stringify({
		...(tracker ? { _tracker: tracker } : {}),
		...Object.fromEntries(Object.entries(refs).map(([host, preview]) => [host, { preview }])),
	})
const storedCookie = () => Cookies.get(previewCookieName)
const storedJSON = () => JSON.parse(storedCookie() ?? "null")

describe("startup", () => {
	it("clears a stale repository session but leaves the website's cookie when inactive", async () => {
		Cookies.set(previewCookieName, "another-tab-ref")
		const { session, bridge, reload } = setup({ isAuthenticated: false })

		await session.start()

		expect(bridge.closeSession).toHaveBeenCalledOnce()
		expect(storedCookie()).toBe("another-tab-ref")
		expect(session.getSnapshot()).toEqual({ status: "idle", authenticated: false })
		expect(events).toEqual([])
		expect(reload).not.toHaveBeenCalled()
	})

	it("stores the session ref and reloads when nothing handles prismicPreviewStart", async () => {
		const { session, reload } = setup(active("ref-1"))

		await session.start()

		expect(storedJSON()).toEqual({ [repository]: { preview: "ref-1" } })
		expect(events).toEqual([["prismicPreviewStart", "ref-1"]])
		expect(reload).toHaveBeenCalledOnce()
		expect(session.getSnapshot().status).toBe("reloading")
	})

	it("lets the website enter the preview itself and polls from there", async () => {
		cancelEvents = true
		Cookies.set(previewCookieName, jsonCookie({ [repository]: "stale-ref" }))
		const { session, bridge, reload } = setup(active("ref-1"))

		await session.start()

		expect(reload).not.toHaveBeenCalled()
		expect(session.getSnapshot()).toMatchObject({
			status: "polling",
			preview: { ref: "ref-1", title: "Spring launch" },
		})
		await vi.advanceTimersByTimeAsync(3000)
		expect(bridge.ping).toHaveBeenCalledWith("ref-1")
	})

	it("converts a raw cookie holding the session ref without notifying", async () => {
		Cookies.set(previewCookieName, "ref-1")
		const { session, reload } = setup(active("ref-1", true))

		await session.start()

		expect(storedJSON()).toEqual({
			_tracker: expect.stringMatching(/^[A-Za-z0-9]{8}$/),
			[repository]: { preview: "ref-1" },
		})
		expect(events).toEqual([])
		expect(reload).not.toHaveBeenCalled()
		expect(session.getSnapshot().status).toBe("polling")
	})

	it("does not rewrite a cookie that already holds the session ref", async () => {
		const cookie = jsonCookie({ [repository]: "ref-1" }, "tracker1")
		Cookies.set(previewCookieName, cookie)
		const { session } = setup(active("ref-1", true))

		await session.start()

		expect(storedCookie()).toBe(cookie)
		expect(events).toEqual([])
	})

	it("leaves an editor-owned ref alone", async () => {
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(repository, "editor-ref", navigationStart - 1)
		const { session, reload } = setup(active("session-ref"))

		await session.start()

		expect(storedCookie()).toBe("editor-ref")
		expect(events).toEqual([])
		expect(reload).not.toHaveBeenCalled()
		expect(session.getSnapshot().status).toBe("polling")
	})

	it("notifies once when the editor pushed after the page started loading", async () => {
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(repository, "editor-ref", navigationStart + 1)
		const { session, reload, bridge } = setup(active("session-ref"))

		await session.start()

		expect(events).toEqual([["prismicPreviewUpdate", "editor-ref"]])
		expect(reload).toHaveBeenCalledOnce()
		expect(storedCookie()).toBe("editor-ref")
		// The page is unloading: it must not start polling.
		expect(session.getSnapshot().status).toBe("reloading")
		await vi.advanceTimersByTimeAsync(3000)
		expect(bridge.ping).not.toHaveBeenCalled()
	})

	it("stops starting up when a cookie change reloads the page meanwhile", async () => {
		const { bridge } = fakeBridge(active("ref-1"))
		let connected = (_bridge: Bridge) => {}
		const reload = vi.fn()
		const session = createPreviewSession({
			repositoryHost: repository,
			codec: "json",
			watchCookie: true,
			connect: () => new Promise<Bridge>((resolve) => (connected = resolve)),
			reload,
			navigationStart,
		})
		sessions.push(session)
		const starting = session.start()

		Cookies.set(previewCookieName, "editor-ref")
		await vi.advanceTimersByTimeAsync(250)
		connected(bridge)
		await starting
		await vi.advanceTimersByTimeAsync(3000)

		expect(events).toEqual([["prismicPreviewStart", "editor-ref"]])
		expect(reload).toHaveBeenCalledOnce()
		expect(session.getSnapshot().status).toBe("reloading")
		expect(storedCookie()).toBe("editor-ref")
		expect(bridge.ping).not.toHaveBeenCalled()
	})

	it("lets a session replace an editor push older than ten minutes", async () => {
		cancelEvents = true
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(repository, "editor-ref", navigationStart - 10 * 60_000)
		const { session } = setup(active("ref-1"))

		await session.start()

		expect(storedJSON()).toEqual({ [repository]: { preview: "ref-1" } })
		expect(events).toEqual([["prismicPreviewStart", "ref-1"]])
	})

	it("follows the session in the editor's poll mode, whatever the editor pushed", async () => {
		cancelEvents = true
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(repository, "editor-ref", navigationStart - 1)
		const { session, server } = setup(active("ref-1"), { watchCookie: false, codec: "plain" })

		await session.start()
		expect(storedCookie()).toBe("ref-1")

		server.ref = "ref-2"
		await vi.advanceTimersByTimeAsync(3000)
		expect(storedCookie()).toBe("ref-2")
		expect(events).toEqual([
			["prismicPreviewStart", "ref-1"],
			["prismicPreviewUpdate", "ref-2"],
		])
	})

	it("ignores a recent push from another repository's editor", async () => {
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(otherRepository, "editor-ref", navigationStart + 1)
		const { session } = setup({ isAuthenticated: false })

		await session.start()

		expect(events).toEqual([])
	})

	it("stays idle without reloading when the browser rejects the cookie", async () => {
		const store = createSiteCookieStore(repository)
		vi.spyOn(store, "writeRef").mockReturnValue(false)
		vi.spyOn(console, "warn").mockImplementation(() => {})
		const { session, reload } = setup(active("ref-1"), { store })

		await session.start()

		expect(reload).not.toHaveBeenCalled()
		expect(events).toEqual([])
		expect(session.getSnapshot().status).toBe("idle")
		expect(console.warn).toHaveBeenCalledWith(
			expect.stringContaining("rejected the preview cookie"),
		)
	})

	it("stays idle when the repository iframe is unreachable", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
		const session = createPreviewSession({
			repositoryHost: repository,
			codec: "json",
			watchCookie: true,
			connect: async () => {
				throw new Error("blocked")
			},
		})
		sessions.push(session)

		await session.start()

		expect(session.getSnapshot().status).toBe("idle")
		expect(console.warn).toHaveBeenCalledOnce()
	})
})

describe("polling", () => {
	async function startPolling(ref = "ref-1", isAuthenticated = false) {
		cancelEvents = true
		Cookies.set(previewCookieName, jsonCookie({ [repository]: ref }))
		const context = setup(active(ref, isAuthenticated))
		await context.session.start()
		return context
	}

	it("never writes while the ref stays the same", async () => {
		const { bridge } = await startPolling()
		const cookie = storedCookie()

		await vi.advanceTimersByTimeAsync(9000)

		expect(bridge.ping).toHaveBeenCalledTimes(3)
		expect(storedCookie()).toBe(cookie)
		expect(events).toEqual([])
	})

	it("does not overwrite a ref the editor pushed in the meantime", async () => {
		const { bridge, server, session } = await startPolling()
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(repository, "editor-ref", Date.now())
		events = []

		await vi.advanceTimersByTimeAsync(3000)
		server.ref = "ref-2"
		await vi.advanceTimersByTimeAsync(3000)

		expect(bridge.ping).toHaveBeenLastCalledWith("ref-1")
		expect(storedCookie()).toBe("editor-ref")
		// The cookie watcher reported the push itself; polling adds nothing.
		expect(events).toEqual([["prismicPreviewUpdate", "editor-ref"]])
		expect(session.getSnapshot().preview?.ref).toBe("ref-2")
	})

	it("stores a new ref and notifies once, then keeps polling when the website handles it", async () => {
		const { server, reload, bridge } = await startPolling("ref-1", true)

		server.ref = "ref-2"
		await vi.advanceTimersByTimeAsync(3000)
		// The cookie watcher sees the toolbar's own write; it must not notify again.
		await vi.advanceTimersByTimeAsync(3000)

		expect(storedJSON()).toEqual({
			_tracker: expect.stringMatching(/^[A-Za-z0-9]{8}$/),
			[repository]: { preview: "ref-2" },
		})
		expect(events).toEqual([["prismicPreviewUpdate", "ref-2"]])
		expect(reload).not.toHaveBeenCalled()
		expect(bridge.ping).toHaveBeenLastCalledWith("ref-2")
	})

	it("reloads on a new ref when nothing handles the update", async () => {
		const { server, reload, bridge } = await startPolling()
		cancelEvents = false

		server.ref = "ref-2"
		await vi.advanceTimersByTimeAsync(3000)
		await vi.advanceTimersByTimeAsync(9000)

		expect(reload).toHaveBeenCalledOnce()
		expect(bridge.ping).toHaveBeenCalledTimes(1)
	})

	it("ends the preview when the session ends and the cookie still holds its ref", async () => {
		const { server, bridge, session } = await startPolling()

		server.ref = null
		await vi.advanceTimersByTimeAsync(3000)

		expect(storedCookie()).toBeUndefined()
		expect(bridge.closeSession).toHaveBeenCalledOnce()
		expect(events).toEqual([["prismicPreviewEnd", null]])
		expect(session.getSnapshot()).toMatchObject({ status: "idle", preview: undefined })
	})

	it("stops quietly when the session ends while the editor owns the cookie", async () => {
		const { server, session } = await startPolling()
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(repository, "editor-ref", Date.now())
		await vi.advanceTimersByTimeAsync(250)
		events = []

		server.ref = null
		await vi.advanceTimersByTimeAsync(3000)

		expect(storedCookie()).toBe("editor-ref")
		expect(events).toEqual([])
		expect(session.getSnapshot().status).toBe("idle")
	})

	it("retries after a failed ping and skips pings while the page is hidden", async () => {
		const { bridge, server } = await startPolling()
		bridge.ping.mockRejectedValueOnce(new Error("offline"))

		await vi.advanceTimersByTimeAsync(3000)
		Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
		await vi.advanceTimersByTimeAsync(9000)
		expect(bridge.ping).toHaveBeenCalledTimes(1)

		server.ref = "ref-2"
		Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
		await vi.advanceTimersByTimeAsync(3000)
		expect(bridge.ping).toHaveBeenCalledTimes(2)
		expect(events).toEqual([["prismicPreviewUpdate", "ref-2"]])
	})

	it("pings as soon as the page is visible again", async () => {
		const { bridge } = await startPolling()
		Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
		await vi.advanceTimersByTimeAsync(6000)

		Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
		document.dispatchEvent(new Event("visibilitychange"))
		await vi.advanceTimersByTimeAsync(0)

		expect(bridge.ping).toHaveBeenCalledOnce()
	})

	it("ignores a ping that answers after exiting", async () => {
		const { bridge, session } = await startPolling()
		let answer = (_response: { ref: string | null }) => {}
		let closed = () => {}
		bridge.ping.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
		bridge.closeSession.mockImplementationOnce(
			() => new Promise<void>((resolve) => (closed = resolve)),
		)
		await vi.advanceTimersByTimeAsync(3000)

		const exiting = session.exit()
		answer({ ref: "ref-2" })
		await vi.advanceTimersByTimeAsync(0)
		closed()
		await exiting

		expect(storedCookie()).toBeUndefined()
		expect(events).toEqual([["prismicPreviewEnd", null]])
	})
})

describe("cookie changes from other tabs and the editor", () => {
	it("notifies once per new ref, ignores rewrites of the same ref, and ends on removal", async () => {
		cancelEvents = true
		Cookies.set(previewCookieName, jsonCookie({ [repository]: "ref-1" }, "tracker1"))
		const { session } = setup({ isAuthenticated: false })
		await session.start()

		Cookies.set(previewCookieName, jsonCookie({ [repository]: "ref-1" }, "tracker2"))
		await vi.advanceTimersByTimeAsync(250)
		Cookies.set(previewCookieName, "editor-ref")
		await vi.advanceTimersByTimeAsync(250)
		await vi.advanceTimersByTimeAsync(250)
		Cookies.remove(previewCookieName)
		await vi.advanceTimersByTimeAsync(250)

		expect(events).toEqual([
			["prismicPreviewUpdate", "editor-ref"],
			["prismicPreviewEnd", null],
		])
	})

	it("reloads when nothing handles a change", async () => {
		const { session, reload } = setup({ isAuthenticated: false })
		await session.start()

		Cookies.set(previewCookieName, "editor-ref")
		await vi.advanceTimersByTimeAsync(1000)

		expect(reload).toHaveBeenCalledOnce()
	})

	it("starts following a session another tab started", async () => {
		cancelEvents = true
		const state: BridgeState = { isAuthenticated: false }
		const { session, bridge, server } = setup(state)
		await session.start()

		state.preview = { ref: "ref-1", title: "Spring launch" }
		server.ref = "ref-1"
		Cookies.set(previewCookieName, jsonCookie({ [repository]: "ref-1" }))
		await vi.advanceTimersByTimeAsync(3250)

		expect(events).toEqual([["prismicPreviewStart", "ref-1"]])
		expect(session.getSnapshot()).toMatchObject({ status: "polling", preview: { ref: "ref-1" } })
		expect(bridge.ping).toHaveBeenCalled()
	})

	it("follows a session started while starting up", async () => {
		cancelEvents = true
		const { session, bridge } = setup(active("ref-1"))
		let answer = (_state: BridgeState) => {}
		bridge.getState.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))

		const starting = session.start()
		await vi.advanceTimersByTimeAsync(0)
		Cookies.set(previewCookieName, jsonCookie({ [repository]: "ref-1" }))
		await vi.advanceTimersByTimeAsync(250)
		answer({ isAuthenticated: false })
		await starting
		await vi.advanceTimersByTimeAsync(3000)

		expect(session.getSnapshot()).toMatchObject({ status: "polling", preview: { ref: "ref-1" } })
		expect(bridge.ping).toHaveBeenCalled()
	})

	it("does not close the repository session when a cookie change finds none", async () => {
		cancelEvents = true
		const { session, bridge } = setup({ isAuthenticated: false })
		await session.start()

		Cookies.set(previewCookieName, jsonCookie({ [repository]: "ref-1" }))
		await vi.advanceTimersByTimeAsync(250)

		expect(bridge.getState).toHaveBeenCalledTimes(2)
		expect(bridge.closeSession).toHaveBeenCalledOnce()
	})

	it("does not watch inside the editor", async () => {
		const { session } = setup({ isAuthenticated: false }, { watchCookie: false, codec: "plain" })
		await session.start()

		Cookies.set(previewCookieName, "editor-ref")
		await vi.advanceTimersByTimeAsync(1000)

		expect(events).toEqual([])
	})
})

describe("exit", () => {
	it("removes its own ref, keeps other repositories' refs, and closes the session", async () => {
		cancelEvents = true
		Cookies.set(
			previewCookieName,
			jsonCookie({ [otherRepository]: "other", [repository]: "ref-1" }),
		)
		const { session, bridge, reload } = setup(active("ref-1"))
		await session.start()

		await session.exit()

		expect(bridge.closeSession).toHaveBeenCalledOnce()
		expect(storedJSON()).toEqual({ [otherRepository]: { preview: "other" } })
		expect(events).toEqual([["prismicPreviewEnd", null]])
		expect(reload).not.toHaveBeenCalled()
		expect(session.getSnapshot()).toMatchObject({ status: "idle", preview: undefined })
		await vi.advanceTimersByTimeAsync(6000)
		expect(bridge.ping).not.toHaveBeenCalled()
	})

	it("reloads when nothing handles the end", async () => {
		Cookies.set(previewCookieName, jsonCookie({ [repository]: "ref-1" }))
		cancelEvents = true
		const { session, reload } = setup(active("ref-1"))
		await session.start()
		cancelEvents = false

		await session.exit()

		expect(reload).toHaveBeenCalledOnce()
	})

	it("clears an editor-owned ref of the same repository", async () => {
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(repository, "editor-ref", navigationStart - 1)
		cancelEvents = true
		const { session } = setup(active("ref-1"))
		await session.start()

		await session.exit()

		expect(storedCookie()).toBeUndefined()
		expect(readOwner()).toBeUndefined()
	})

	it("leaves another repository's editor-owned ref", async () => {
		Cookies.set(previewCookieName, "editor-ref")
		claimOwnership(otherRepository, "editor-ref", navigationStart - 1)
		cancelEvents = true
		const { session } = setup(active("ref-1"))
		await session.start()

		await session.exit()

		expect(storedCookie()).toBe("editor-ref")
		expect(readOwner()?.repository).toBe(otherRepository)
		expect(events).toEqual([["prismicPreviewEnd", null]])
	})
})
