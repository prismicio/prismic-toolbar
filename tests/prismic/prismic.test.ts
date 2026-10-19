import { beforeEach, describe, expect, it, vi } from "vitest"

import type * as env from "../../src/lib/env"
import type { ToolbarMode } from "../../src/lib/env"
import { version } from "../../vite.config"

const mocks = vi.hoisted(() => ({
	mode: "regular" as ToolbarMode,
	startLegacy: vi.fn(),
	createPreviewSession: vi.fn(() => ({ start: vi.fn() })),
	createEmbeddedPush: vi.fn(),
	loadChunk: vi.fn(() => new Promise(() => {})),
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
vi.mock("../../src/lib/chunks", () => ({ loadChunk: mocks.loadChunk }))

beforeEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

/** Runs `prismic.js` in a mode, installed with the given query parameters. */
async function run(mode: ToolbarMode, query: string) {
	mocks.mode = mode
	document.head.innerHTML = `<script src="https://static.cdn.prismic.io/prismic.js?${query}"></script>`
	await import("../../src/prismic")
}

const assets = expect.stringMatching(new RegExp(`/prismic-toolbar/${version}$`))

describe("prismic.js", () => {
	it.each(["new=true&repo=example", "new=true&repo=example&v=5"])(
		"starts the legacy flow on websites, with %s",
		async (query) => {
			await run("regular", query)

			expect(mocks.startLegacy).toHaveBeenCalledExactlyOnceWith({
				repositoryHost: "example.prismic.io",
				assets,
				connect: expect.any(Function),
			})
			expect(mocks.createPreviewSession).not.toHaveBeenCalled()
			expect(mocks.loadChunk).not.toHaveBeenCalled()
		},
	)

	it.each(["new=true&repo=example", "new=true&repo=example&v=5"])(
		"lets the editor push refs in embedded-push mode, with %s",
		async (query) => {
			await run("embedded-push", query)

			expect(mocks.startLegacy).not.toHaveBeenCalled()
			expect(mocks.createPreviewSession).not.toHaveBeenCalled()
			expect(mocks.createEmbeddedPush).toHaveBeenCalledExactlyOnceWith({
				repositoryHost: "example.prismic.io",
			})
			expect(mocks.loadChunk).toHaveBeenCalledExactlyOnceWith(
				expect.stringMatching(/\/embedded-preview\.js$/),
				"setupEmbeddedPreview",
			)
		},
	)

	it.each(["new=true&repo=example", "new=true&repo=example&v=5"])(
		"polls the preview session in embedded-poll mode, with %s",
		async (query) => {
			await run("embedded-poll", query)

			expect(mocks.startLegacy).not.toHaveBeenCalled()
			expect(mocks.createEmbeddedPush).not.toHaveBeenCalled()
			expect(mocks.createPreviewSession).toHaveBeenCalledExactlyOnceWith({
				repositoryHost: "example.prismic.io",
				codec: "plain",
				watchCookie: false,
				connect: expect.any(Function),
			})
			expect(mocks.loadChunk).toHaveBeenCalledExactlyOnceWith(
				expect.stringMatching(/\/embedded-preview\.js$/),
				"setupEmbeddedPreview",
			)
		},
	)

	it("starts nothing without a repository", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
		await run("regular", "new=true&v=5")

		expect(mocks.startLegacy).not.toHaveBeenCalled()
		expect(console.warn).toHaveBeenCalledOnce()
	})
})
