import { readFileSync, writeFileSync } from "node:fs"

import {
	test as base,
	expect,
	type APIRequestContext,
	type Browser,
	type BrowserContext,
	type Page,
} from "@playwright/test"

import { STORAGE_STATE } from "../../playwright.config"
import { version } from "../../vite.config"
import { Prismic, type Document, type Repository } from "./client"

export { expect }

export const previewCookieName = "io.prismic.preview"
export const sessionCookieName = "io.prismic.previewSession"
export const ownerCookieName = "io.prismic.preview.updated"

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
export async function serveToolbar(context: BrowserContext) {
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
	/** A second repository, previewed on the same website. */
	otherRepository: Repository
	/** A published page with its own UID, so tests never share content. */
	doc: Document
	website: Website
	editor: Editor
	/** Saves a draft of `doc` and previews it from Prismic, in `page` unless another tab is given. */
	startPreview: (options?: {
		payload?: string
		tab?: Page
		doc?: Document
		repository?: Repository
	}) => Promise<Document>
	/** Opens a fresh browser, signed out of Prismic, like someone a link was shared with. */
	visitor: () => Promise<Page>
}

export const test = base.extend<Fixtures, { prismic: Prismic }>({
	prismic: [async ({}, use) => use(await Prismic.signIn()), { scope: "worker" }],
	context: async ({ context }, use) => {
		await serveToolbar(context)
		await use(context)
	},
	repository: async ({ prismic }, use, { parallelIndex }) =>
		use(prismic.repository(readRepositories()[parallelIndex * 2]!)),
	otherRepository: async ({ prismic }, use, { parallelIndex }) =>
		use(prismic.repository(readRepositories()[parallelIndex * 2 + 1]!)),
	doc: async ({ repository }, use) => use(await repository.createDocument()),
	website: async ({ page, baseURL, repository }, use) =>
		use(new Website(page, baseURL!, repository)),
	editor: async ({ baseURL }, use) => use(new Editor(baseURL!)),
	startPreview: async ({ page, repository, doc, editor }, use) => {
		await use(async (options = {}) => {
			const { payload = "Draft 1", tab = page } = options
			const repo = options.repository ?? repository
			const draft = await repo.updateDraft(options.doc ?? doc, { payload })
			await editor.preview(tab, repo, draft)
			await expect(tab.getByTestId("payload").first()).toHaveText(payload)
			return draft
		})
	},
	visitor: async ({ browser }, use) => {
		const contexts: BrowserContext[] = []
		await use(async () => {
			const context = await newContext(browser)
			contexts.push(context)
			return context.newPage()
		})
		for (const context of contexts) await context.close()
	},
})

async function newContext(browser: Browser) {
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
	await serveToolbar(context)
	return context
}

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
		return this.page.getByRole("region", { name: "Prismic preview" })
	}

	pageURL(doc: Document, repository = this.repository) {
		return `${this.url}/${repository.domain}/${doc.uid}`
	}

	async goto(doc: Document) {
		await this.page.goto(this.pageURL(doc))
	}

	/** Makes pages update in place on preview events, like frameworks, instead of reloading. */
	async handleEvents() {
		await this.page.context().addCookies([{ name: "events", value: "handle", url: this.url }])
	}

	/** Preview events this page load received. */
	events(page = this.page) {
		return page.evaluate(() => window.previewEvents)
	}

	/** Marks this page load. A reload loses the mark. */
	async mark(page = this.page) {
		await page.evaluate(() => (document.documentElement.dataset.marker = ""))
	}

	async expectSameLoad(page = this.page) {
		await expect(page.locator("html")).toHaveAttribute("data-marker", "")
	}

	async exit(page = this.page) {
		await page
			.getByRole("region", { name: "Prismic preview" })
			.getByRole("button", { name: "Exit preview" })
			.click()
	}

	/** Reads one of the website's cookies, decoded. */
	async cookie(name: string, context = this.page.context()) {
		const cookie = (await context.cookies(this.url)).find((cookie) => cookie.name === name)
		return cookie && { ...cookie, value: decodeURIComponent(cookie.value) }
	}

	/** The repository's ref in the preview cookie, read like the Content API does. */
	async previewRef(repository = this.repository, context = this.page.context()) {
		const value = (await this.cookie(previewCookieName, context))?.value
		if (!value) return undefined
		try {
			return JSON.parse(value)[repository.host]?.preview as string | undefined
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
		const session = await this.startSession(page.context(), repository, doc)
		await page.goto(session.url)
		return session
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
			id: session_id,
			ref: new URL(preview_url).searchParams.get("token")!,
		}
	}
}
