import { beforeEach, describe, expect, it, vi } from "vitest"

import type * as env from "../../src/lib/env"
import type { ToolbarMode } from "../../src/lib/env"

const mocks = vi.hoisted(() => ({
	mode: "regular" as ToolbarMode,
	startLegacy: vi.fn(),
	createPreviewSession: vi.fn(() => ({ start: vi.fn() })),
	createEmbeddedPush: vi.fn(),
}))
vi.mock("../../src/lib/env", async (importOriginal) => ({
	...(await importOriginal<typeof env>()),
	detectMode: () => mocks.mode,
}))
vi.mock("../../src/lib/legacy", () => ({ startLegacy: mocks.startLegacy }))
vi.mock("../../src/lib/preview-session", () => ({
	createPreviewSession: mocks.createPreviewSession,
}))
vi.mock("../../src/lib/embedded-push", () => ({ createEmbeddedPush: mocks.createEmbeddedPush }))
vi.mock("../../src/lib/chunks", () => ({ loadChunk: () => new Promise(() => {}) }))

beforeEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

async function run(mode: ToolbarMode, query: string) {
	mocks.mode = mode
	document.head.innerHTML = `<script src="https://static.cdn.prismic.io/prismic.js?${query}"></script>`
	await import("../../src/prismic")
}

describe.each(["repo=example", "repo=example&v=5"])("prismic.js?%s", (query) => {
	it("starts the legacy flow on websites", async () => {
		await run("regular", query)

		expect(mocks.startLegacy).toHaveBeenCalledExactlyOnceWith({
			repositoryHost: "example.prismic.io",
			assets: expect.stringContaining("/prismic-toolbar/"),
			connect: expect.any(Function),
		})
		expect(mocks.createPreviewSession).not.toHaveBeenCalled()
	})

	it("lets the editor push refs in embedded-push mode", async () => {
		await run("embedded-push", query)

		expect(mocks.startLegacy).not.toHaveBeenCalled()
		expect(mocks.createEmbeddedPush).toHaveBeenCalledOnce()
	})

	it("polls the preview session in embedded-poll mode", async () => {
		await run("embedded-poll", query)

		expect(mocks.startLegacy).not.toHaveBeenCalled()
		expect(mocks.createPreviewSession).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ codec: "plain", watchCookie: false }),
		)
	})
})
