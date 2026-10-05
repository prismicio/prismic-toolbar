import { afterEach, describe, expect, it, vi } from "vitest"

import { createBridgeClient } from "../src/core/bridge"
import type { BridgeMethods } from "../src/core/bridge-protocol"
import { servePort } from "../src/iframe/server"

const channels: MessageChannel[] = []
afterEach(() => {
	for (const { port1, port2 } of channels.splice(0)) {
		port1.close()
		port2.close()
	}
})

function connect(handlers: Partial<BridgeMethods>, timeout?: number) {
	const channel = new MessageChannel()
	channels.push(channel)
	servePort(channel.port2, handlers as BridgeMethods)
	return createBridgeClient(channel.port1, { timeout })
}

describe("bridge", () => {
	it("calls methods with their parameters and resolves concurrent calls independently", async () => {
		const bridge = connect({
			ping: async (ref) => ({ ref: `${ref}-next` }),
			getState: async () => ({ isAuthenticated: true }),
		})

		await expect(
			Promise.all([bridge.ping("a"), bridge.ping("b"), bridge.getState()]),
		).resolves.toEqual([{ ref: "a-next" }, { ref: "b-next" }, { isAuthenticated: true }])
	})

	it("rejects with the server's error message", async () => {
		const bridge = connect({
			share: async () => {
				throw new Error("No active preview session to share.")
			},
		})

		await expect(bridge.share("https://example.com/")).rejects.toThrow(
			"No active preview session to share.",
		)
	})

	it("rejects calls that do not answer in time and calls pending on dispose", async () => {
		const bridge = connect({ closeSession: () => new Promise(() => {}) }, 50)
		await expect(bridge.closeSession()).rejects.toThrow("closeSession timed out")

		const onDispose = vi.fn()
		const channel = new MessageChannel()
		channels.push(channel)
		const silent = createBridgeClient(channel.port1, { onDispose })
		const pending = silent.getState()
		silent.dispose()
		await expect(pending).rejects.toThrow("bridge disposed")
		expect(onDispose).toHaveBeenCalledOnce()
	})
})
