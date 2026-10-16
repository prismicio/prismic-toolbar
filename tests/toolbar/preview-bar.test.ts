import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { PreviewSession, PreviewSnapshot } from "../../src/lib/preview-session"
import { renderPreviewBar } from "../../src/toolbar/preview-bar"

const previewing: PreviewSnapshot = {
	status: "polling",
	authenticated: true,
	preview: { ref: "ref-1", title: "Spring launch" },
}

let root: HTMLDivElement
let listeners: Set<(snapshot: PreviewSnapshot) => void>
let snapshot: PreviewSnapshot
let share: ReturnType<typeof vi.fn<(pageURL?: string) => Promise<string>>>
let unmount: () => void

function publish(patch: Partial<PreviewSnapshot>) {
	snapshot = { ...snapshot, ...patch }
	for (const listener of listeners) listener(snapshot)
}

const bar = () => root.querySelector(".bar")
const activeLabel = () => root.querySelector(".share > :not(.inactive)")?.className

beforeEach(() => {
	root = document.createElement("div")
	listeners = new Set()
	snapshot = previewing
	share = vi.fn(async () => "https://example.prismic.io/previews/s/share-id")
	const session = {
		exit: vi.fn(async () => {}),
		share,
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
	} as Partial<PreviewSession> as PreviewSession
	vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn(async () => {}) } })
	unmount = renderPreviewBar(root, { session, repositoryHost: "example.prismic.io" })
})

afterEach(() => unmount())

describe("renderPreviewBar", () => {
	it("updates the bar in place", () => {
		const title = root.querySelector(".title")
		const status = root.querySelector(".status")

		publish({ status: "reloading", preview: { ref: "ref-2", title: "Summer launch" } })

		expect(root.querySelector(".title")).toBe(title)
		expect(title?.textContent).toBe("Summer launch")
		expect(title?.getAttribute("title")).toBe("Summer launch")
		expect(root.querySelector(".status")).toBe(status)
		expect(status?.textContent).toBe("Updating…")
	})

	it("shows the bar only while previewing", () => {
		publish({ status: "idle", preview: undefined })
		expect(bar()).toBeNull()

		publish(previewing)
		expect(bar()).not.toBeNull()
	})

	it("offers visitors no share button", () => {
		publish({ authenticated: false })

		expect(root.querySelector(".share")).toBeNull()
		expect(root.querySelector("span.logo")).not.toBeNull()
		expect(root.querySelector(".powered")).not.toBeNull()
	})

	it("returns to the share label after copying", async () => {
		vi.useFakeTimers()
		const button = root.querySelector<HTMLButtonElement>(".share")!

		button.click()
		expect(activeLabel()).toBe("label-loading")
		expect(button.disabled).toBe(true)
		await vi.waitFor(() => expect(activeLabel()).toBe("label-copied"))
		expect(button.disabled).toBe(false)

		vi.advanceTimersByTime(2000)
		expect(activeLabel()).toBe("label-idle")
		expect(root.querySelector(".share")).toBe(button)
	})

	it("stops following the session once removed", async () => {
		let resolve!: (url: string) => void
		share.mockReturnValue(new Promise((r) => (resolve = r)))
		const button = root.querySelector<HTMLButtonElement>(".share")!
		button.click()

		unmount()
		resolve("https://example.prismic.io/previews/s/share-id")
		await new Promise((resolve) => setTimeout(resolve))

		expect(listeners.size).toBe(0)
		expect(bar()).toBeNull()
		expect(button.isConnected).toBe(false)
		expect(button.querySelector(":not(.inactive)")?.className).toBe("label-loading")
	})
})
