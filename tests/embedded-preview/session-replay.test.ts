import { beforeEach, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({ init: vi.fn(), start: vi.fn(), shutdown: vi.fn() }))
vi.mock("@amplitude/session-replay-browser", () => sdk)

beforeEach(async () => {
	vi.resetModules()
	vi.resetAllMocks()
	sdk.init.mockReturnValue({ promise: Promise.resolve() })
	sdk.start.mockReturnValue({ promise: Promise.resolve() })
	await import("../../src/session-replay")
})

const config = {
	apiKey: "test-key",
	deviceId: "test-device",
	sessionId: 123,
	sampleRate: 0.01,
	serverZone: "EU" as const,
	privacyConfig: { defaultMaskLevel: "medium" as const, unmaskSelector: [".visible"] },
}

it("shares the parent's identity and waits for its start signal", async () => {
	await window.__prismicToolbar!.setSessionReplay!(config)
	expect(sdk.init).toHaveBeenCalledWith("test-key", {
		deviceId: "test-device",
		sessionId: 123,
		sampleRate: 0.01,
		serverZone: "EU",
		crossOriginIframes: { enabled: true },
		privacyConfig: { defaultMaskLevel: "medium", unmaskSelector: [".visible"] },
	})
	expect(sdk.start).not.toHaveBeenCalled()
})

it("does not restart when disabled during initialization", async () => {
	let finish!: () => void
	sdk.init.mockReturnValue({
		promise: new Promise<void>((resolve) => {
			finish = resolve
		}),
	})
	const setReplay = window.__prismicToolbar!.setSessionReplay!
	const starting = setReplay(config)
	await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledOnce())
	const stopping = setReplay(undefined)
	finish()
	await Promise.all([starting, stopping])
	expect(sdk.start).not.toHaveBeenCalled()
	expect(sdk.shutdown).toHaveBeenCalled()
})

it("recovers after a failed initialization", async () => {
	sdk.init.mockReturnValueOnce({ promise: Promise.reject(new Error("offline")) })
	const setReplay = window.__prismicToolbar!.setSessionReplay!
	await expect(setReplay(config)).rejects.toThrow("offline")
	await setReplay({ ...config, sessionId: 456 })
	expect(sdk.start).not.toHaveBeenCalled()
})
