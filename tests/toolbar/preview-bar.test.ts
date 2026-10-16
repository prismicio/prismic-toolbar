import { beforeEach, expect, it, vi } from "vitest"

import type { PreviewSession, PreviewSnapshot } from "../../src/lib/preview-session"
import { mountToolbar } from "../../src/toolbar"

let root: ShadowRoot
const listeners = new Set<(snapshot: PreviewSnapshot) => void>()
let snapshot: PreviewSnapshot
let unmount: () => void

function publish(patch: Partial<PreviewSnapshot>) {
	snapshot = { ...snapshot, ...patch }
	for (const listener of listeners) listener(snapshot)
}

beforeEach(() => {
	unmount?.()
	snapshot = { status: "polling", authenticated: true, preview: { ref: "1", title: "Spring" } }
	vi.stubGlobal("navigator", { clipboard: { writeText: async () => {} } })
	const session = {
		share: async () => "https://example.prismic.io/previews/s/id",
		getSnapshot: () => snapshot,
		subscribe(listener: (snapshot: PreviewSnapshot) => void) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
	} as Partial<PreviewSession> as PreviewSession
	unmount = mountToolbar({ session, repositoryHost: "example.prismic.io" })
	root = document.querySelector("#prismic-toolbar")!.shadowRoot!
})

it("updates the bar in place", () => {
	const title = root.querySelector(".title")

	publish({ status: "reloading", preview: { ref: "2", title: "Summer" } })

	expect(root.querySelector(".title")).toBe(title)
	expect(title?.textContent).toBe("Summer")
	expect(root.querySelector(".status")?.textContent).toBe("Updating…")
})

it("shows the bar while previewing, with a share button for Prismic users only", () => {
	publish({ authenticated: false })
	expect(root.querySelector(".share")).toBeNull()
	expect(root.querySelector(".powered")).not.toBeNull()

	publish({ preview: undefined })
	expect(root.querySelector(".bar")).toBeNull()
})

it("shows the share label again two seconds after copying", async () => {
	vi.useFakeTimers()
	const button = root.querySelector<HTMLButtonElement>(".share")!
	const label = () => [...button.children].find((span) => !span.matches(".inactive"))?.className

	button.click()
	expect(label()).toBe("label-loading")
	await vi.waitFor(() => expect(label()).toBe("label-copied"))
	vi.advanceTimersByTime(2000)
	expect(label()).toBe("label-idle")
})

it("stops following the session once removed", () => {
	unmount()

	expect(listeners.size).toBe(0)
	expect(document.querySelector("#prismic-toolbar")).toBeNull()
})
