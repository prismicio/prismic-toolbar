import { readFileSync, writeFileSync } from "node:fs"

import {
	test as base,
	expect,
	type APIRequestContext,
	type BrowserContext,
	type Frame,
	type Page,
} from "@playwright/test"

import { STORAGE_STATE } from "../../playwright.config"
import { version } from "../../vite.config"
import { Prismic, type Document, type Repository, type Slice } from "./client"

export { expect }

export const previewCookieName = "io.prismic.preview"
export const sessionCookieName = "io.prismic.previewSession"

/** Where the setup project saves the repositories it created, next to the Prismic login. */
const repositoriesCookieName = "e2e-repositories"

export function readRepositories(): string[] {
	const state: { cookies?: { name: string; value: string }[] } = JSON.parse(
		readFileSync(STORAGE_STATE, "utf8"),
	)
	const cookie = state.cookies?.find((cookie) => cookie.name === repositoriesCookieName)
	return cookie?.value ? cookie.value.split(",") : []
}

export async function saveState(request: APIRequestContext, repositories: Repository[]) {
	const state = await request.storageState()
	state.cookies = state.cookies.filter((cookie) => cookie.name !== repositoriesCookieName)
	state.cookies.push({
		name: repositoriesCookieName,
		value: repositories.map((repository) => repository.domain).join(","),
		domain: "localhost",
		path: "/",
		expires: -1,
		httpOnly: false,
		secure: false,
		sameSite: "Lax",
	})
	writeFileSync(STORAGE_STATE, JSON.stringify(state))
}

/**
 * Serves this branch's build where Prismic serves the toolbar. The shell is served at its URL on
 * the repository host, so it runs there with the repository's real cookies.
 */
async function serveToolbar(context: BrowserContext) {
	const dist = `dist/prismic-toolbar/${version}`
	await context.route("https://static.cdn.prismic.io/prismic.js?*", (route) =>
		route.fulfill({ path: `${dist}/prismic.js` }),
	)
	const assets = new RegExp(`^https://([\\w-]+\\.)?prismic\\.io/prismic-toolbar/${version}/`)
	await context.route(assets, (route) =>
		route.fulfill({ path: `${dist}/${new URL(route.request().url()).pathname.split("/").pop()}` }),
	)
}

type Fixtures = {
	repository: Repository
	/** A published page with its own UID, so tests never share content. */
	doc: Document
	website: Website
	editor: Editor
	/** Saves a draft of `doc` with "Draft 1", and previews it from Prismic in `tab`. */
	startPreview: (tab?: Page) => Promise<Document>
	pageBuilder: PageBuilder
	/** URLs the browser requested during the test. */
	requests: string[]
	/** Opens a fresh browser, signed out of Prismic, like someone a link was shared with. */
	visitor: () => Promise<Page>
}

export const test = base.extend<Fixtures, { prismic: Prismic }>({
	// oxlint-disable-next-line no-empty-pattern
	prismic: [async ({}, use) => use(await Prismic.signIn()), { scope: "worker" }],
	context: async ({ context }, use) => {
		await serveToolbar(context)
		await use(context)
	},
	pageBuilder: async ({ page, repository, baseURL }, use) => {
		await use(new PageBuilder(page, repository, baseURL!))
		// The editor may still be loading flags.
		await page.unrouteAll({ behavior: "ignoreErrors" })
	},
	requests: async ({ context }, use) => {
		const requests: string[] = []
		context.on("request", (request) => requests.push(request.url()))
		await use(requests)
	},
	repository: async ({ prismic }, use, { parallelIndex }) =>
		use(prismic.repository(readRepositories()[parallelIndex]!)),
	doc: async ({ repository }, use) => use(await repository.createDocument()),
	website: async ({ page, baseURL, repository }, use) =>
		use(new Website(page, baseURL!, repository)),
	editor: async ({ baseURL }, use) => use(new Editor(baseURL!)),
	startPreview: async ({ page, repository, doc, editor }, use) => {
		await use(async (tab = page) => {
			const draft = await repository.updateDraft(doc, { payload: "Draft 1" })
			await editor.preview(tab, repository, draft)
			await expect(tab.getByTestId("payload").first()).toHaveText("Draft 1")
			return draft
		})
	},
	visitor: async ({ browser }, use) => {
		const contexts: BrowserContext[] = []
		await use(async () => {
			// Contexts inherit the project's storage state, which holds the Prismic login.
			const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
			contexts.push(context)
			await serveToolbar(context)
			return context.newPage()
		})
		for (const context of contexts) await context.close()
	},
})

declare global {
	interface Window {
		previewEvents: [type: string, ref: string | null][]
	}
}

/** The website under test, `tests/website/server.ts`. */
export class Website {
	/** URLs this tab loaded, to tell whether the toolbar reloaded it. */
	readonly loads: string[] = []

	constructor(
		readonly page: Page,
		readonly url: string,
		readonly repository: Repository,
	) {
		page.on("framenavigated", (frame) => {
			if (frame === page.mainFrame()) this.loads.push(frame.url())
		})
	}

	get payload() {
		return this.page.getByTestId("payload").first()
	}

	get bar() {
		return this.barOf(this.page)
	}

	barOf(page: Page) {
		return page.getByRole("region", { name: "Prismic preview" })
	}

	pageURL(doc: Document) {
		return `${this.url}/${this.repository.domain}/${doc.uid}`
	}

	async goto(doc: Document) {
		await this.page.goto(this.pageURL(doc))
	}

	/** Makes pages update in place on preview events, like frameworks, instead of reloading. */
	async handleEvents() {
		// Readable in the editor's cross-site iframe too.
		const cookie = { name: "events", value: "handle", domain: "localhost", path: "/" }
		await this.page.context().addCookies([{ ...cookie, sameSite: "None", secure: true }])
	}

	/** Preview events this page load received. */
	events(page: Page | Frame = this.page) {
		return page.evaluate(() => window.previewEvents)
	}

	/** Marks this page load. A reload loses the mark. */
	async mark(page: Page | Frame = this.page) {
		await page.evaluate(() => (document.documentElement.dataset.marker = ""))
	}

	async expectSameLoad(page: Page | Frame = this.page) {
		await expect(page.locator("html")).toHaveAttribute("data-marker", "")
	}

	async exit(bar = this.bar) {
		await bar.getByRole("button", { name: "Exit preview" }).click()
	}

	/** Reads one of the website's cookies, decoded. */
	async cookie(name: string) {
		const cookies = await this.page.context().cookies(this.url)
		const cookie = cookies.find((cookie) => cookie.name === name)
		return cookie && { ...cookie, value: decodeURIComponent(cookie.value) }
	}

	/** The repository's ref in the preview cookie, read like the Content API does. */
	async previewRef() {
		const value = (await this.cookie(previewCookieName))?.value
		if (!value) return undefined
		try {
			return JSON.parse(value)[this.repository.host]?.preview as string | undefined
		} catch {
			return value
		}
	}
}

/** Starts previews like the Prismic editor's Preview button. */
export class Editor {
	constructor(readonly website: string) {}

	/**
	 * Asks Prismic for a preview session of the document's draft, which sets the repository's session
	 * cookie, then opens the website's preview route in `page`, with `session` like the editor.
	 */
	async preview(page: Page, repository: Repository, doc: Document) {
		await page.goto((await this.startSession(page.context(), repository, doc)).url)
	}

	/** Starts the session without opening the website. */
	async startSession(context: BrowserContext, repository: Repository, doc: Document) {
		const query = new URLSearchParams({
			previewId: await repository.previewID(this.website),
			documentId: doc.id,
		})
		const res = await context.request.get(`${repository.url}/core/previews/session/draft?${query}`)
		expect(res.ok(), "Could not start a preview session.").toBe(true)
		const { preview_url, session_id }: { preview_url: string; session_id: string } =
			await res.json()
		return {
			url: `${preview_url}&session=${encodeURIComponent(session_id)}`,
			ref: new URL(preview_url).searchParams.get("token")!,
		}
	}
}

/** The Prismic Page Builder, editing a page with the website as its live preview. */
export class PageBuilder {
	constructor(
		readonly page: Page,
		readonly repository: Repository,
		readonly website: string,
	) {}

	/** The website, in the editor's preview iframe. */
	get preview() {
		return this.page.frameLocator('iframe[name^="prismic:embedded-preview"]')
	}

	get frame(): Frame {
		const frame = this.page.frames().find((frame) => frame.name().startsWith("prismic:embedded"))
		if (!frame) throw new Error("The Page Builder shows no preview.")
		return frame
	}

	/** The toolbar's highlight of a slice, with its controls. */
	slice(slice: Slice) {
		return this.preview.locator(`.slice-highlight[data-slice-id="text_block$${slice.id}"]`)
	}

	/** Selects the slice showing `text` in the preview, and appends `suffix` to it in the editor. */
	async edit(text: string, suffix: string) {
		await this.preview.getByText(text).click()
		const field = this.page.locator('[contenteditable="true"][aria-label="Text"]')
		await expect(field).toHaveText(text)
		await field.click()
		await this.page.keyboard.press("End")
		await this.page.keyboard.type(suffix)
		await expect(field).toHaveText(text + suffix)
	}

	/**
	 * Opens `doc`. Live editing and how it updates the preview are behind feature flags, the only
	 * part of Prismic's responses this changes: `push` sends refs to the website, `poll` lets the
	 * toolbar follow the preview session. `inPlace` adds `reload: false` to the refs the editor
	 * pushes, which only editors with Content API previews send, not yet available to test accounts.
	 */
	async open(
		doc: Document,
		{ mode, inPlace = false }: { mode: "push" | "poll"; inPlace?: boolean },
	) {
		const context = this.page.context()
		// The editor is public, the website on the loopback.
		await context.grantPermissions(["local-network-access"], { origin: this.repository.url })
		await this.page.route("https://amplitude.prismic.io/api/sdk/v2/vardata*", async (route) => {
			const response = await route.fetch()
			const flags = await response.json()
			const flag = (value: string) => ({ key: value, value })
			flags["pb-ai-live-editing"] = flag("on")
			flags["pb-embedded-preview-push-updates"] = flag(mode === "push" ? "on" : "off")
			await route.fulfill({ response, json: flags })
		})
		if (inPlace) {
			// Runs before the toolbar's listener, in the website's frame.
			await context.addInitScript(() => {
				if (window.name !== "prismic:embedded-preview") return
				const type = "prismic:embedded-preview:set-ref"
				const listener = (event: MessageEvent) => {
					if (event.data?.type === type) event.data.reload = false
				}
				addEventListener("message", listener, { capture: true })
			})
		}
		await this.page.goto(`${this.repository.url}/builder/pages/${doc.id}`)
		// Live editing asks for a setup the website does not need.
		const dialog = this.page.getByRole("dialog", { name: /missing the configuration/ })
		await dialog.getByRole("button", { name: "Close" }).click()
		// Each website is one of the repository's previews.
		await this.page.getByRole("combobox").filter({ hasText: "Select a preview" }).click()
		await this.page.getByRole("option", { name: this.website }).click()
		// The editor's first ref reloads the website: wait for it before using the overlay.
		await expect(this.preview.locator("main[data-preview]")).toBeVisible()
	}
}
