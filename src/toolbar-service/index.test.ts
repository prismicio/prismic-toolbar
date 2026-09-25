import { afterEach, expect, it, vi } from "vitest"

import { setup } from "./iframe"
import { ToolbarService } from "./index"

vi.mock("./iframe", () => ({ setup: vi.fn() }))

const listeners = vi.spyOn(window, "addEventListener")

afterEach(() => {
	for (const [type, listener] of listeners.mock.calls) {
		if (type === "message") window.removeEventListener(type, listener as EventListener)
	}
	vi.restoreAllMocks()
})

it("removes the setup listener after accepting the first MessageChannel connection", async () => {
	await ToolbarService.setupIframe()
	const firstPort = { postMessage: vi.fn() }
	const secondPort = { postMessage: vi.fn() }
	for (const port of [firstPort, secondPort]) {
		window.dispatchEvent(
			new MessageEvent("message", {
				data: "setup_port",
				ports: [port as unknown as MessagePort],
			}),
		)
	}
	expect(setup).toHaveBeenCalledExactlyOnceWith(firstPort)
	expect(firstPort.postMessage).toHaveBeenCalledExactlyOnceWith("ready")
	expect(secondPort.postMessage).not.toHaveBeenCalled()
})
