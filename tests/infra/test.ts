import {
	test as base,
	expect,
	type BrowserContext,
	type Frame,
	type Page,
	type Route,
} from "@playwright/test"

import { version } from "../../vite.config"

export const previewCookieName = "io.prismic.preview"
export const ownerCookieName = "io.prismic.preview.updated"
export const sessionCookieName = "io.prismic.previewSession"

const toolbarFile = (name: string) => `build/prismic-toolbar/${version}/${name}`

type PreviewEvent = [type: string, ref: string | null]

declare global {
	interface Window {
		/** Preview events a website received, when it records them. */
		previewEvents: PreviewEvent[]
		/** Types of the messages a website received, to know when the toolbar handled one. */
		receivedMessages: unknown[]
		/** The fake Prismic editor's state. */
		editor: {
			messages: { type: string; [key: string]: unknown }[]
			send(message: unknown): void
			updateComments(patch: Record<string, unknown>): void
		}
	}
}

/** A Prismic repository with a fake preview session, serving the toolbar's iframe. */
export class Repository {
	readonly host = "toolbar-e2e.prismic.io"
	readonly url = `https://${this.host}`
	readonly title = "Spring launch"
	readonly sessionID = "e2e-session"
	/** The preview session's ref, `null` once the session ended. */
	ref: string | null = null
	authenticated = true
	/** Refs the toolbar pinged the session with. */
	readonly pings: string[] = []
	/** Query parameters of share link requests. */
	readonly shares: Record<string, string>[] = []

	constructor(private readonly context: BrowserContext) {}

	/** Starts a preview session, like opening a preview from the Prismic editor. */
	async startPreview(ref: string, { authenticated = true } = {}) {
		this.ref = ref
		this.authenticated = authenticated
		await this.context.addCookies([
			{
				name: sessionCookieName,
				value: this.sessionID,
				url: this.url,
				secure: true,
				sameSite: "None",
			},
		])
	}

	async hasSession() {
		const cookies = await this.context.cookies(this.url)
		return cookies.some((cookie) => cookie.name === sessionCookieName)
	}

	async route() {
		await this.context.route(`${this.url}/**`, (route) => this.handle(route))
	}

	private async handle(route: Route) {
		const url = new URL(route.request().url())

		if (url.pathname === `/prismic-toolbar/${version}/iframe.html`) {
			return route.fulfill({ path: toolbarFile("iframe.html") })
		}
		if (url.pathname === "/toolbar/state") {
			return route.fulfill({
				json: {
					csrf: "csrf-token",
					isAuthenticated: this.authenticated,
					previewState: this.ref ? { ref: this.ref, title: this.title, lastUpdate: 1 } : null,
				},
			})
		}
		if (url.pathname === `/previews/${this.sessionID}/ping`) {
			const ref = url.searchParams.get("ref") ?? ""
			this.pings.push(ref)
			return route.fulfill({
				json: this.ref
					? { ref: this.ref, reload: this.ref !== ref }
					: { reload: false, close: true },
			})
		}
		if (url.pathname === "/previews/s" && route.request().method() === "POST") {
			this.shares.push(Object.fromEntries(url.searchParams))
			return route.fulfill({
				json: { url: `${this.url}/previews/s/share-id`, hasPreviewImage: false },
			})
		}
		return route.fallback()
	}
}

/**
 * A website with the toolbar installed. It renders the ref of the preview cookie, like a website
 * using a Prismic SDK. It is served on `https://website.test` and `http://localhost:3000`.
 */
export class Website {
	readonly url = "https://website.test"
	/** The ref each page load rendered, `null` for published content. */
	readonly loads: (string | null)[] = []
	/**
	 * How the website handles preview events: ignores them, so the toolbar reloads the page; records
	 * them, still reloading; or records and handles them, so the toolbar does not reload.
	 */
	events: "ignore" | "record" | "handle" = "ignore"

	constructor(
		readonly page: Page,
		private readonly repository: Repository,
	) {}

	get content() {
		return this.page.locator("#content")
	}

	get previewBar() {
		return this.page.getByRole("region", { name: "Prismic preview" })
	}

	async goto({ events = this.events } = {}) {
		this.events = events
		await this.page.goto(this.url)
	}

	recordedEvents(page: Page | Frame = this.page) {
		return page.evaluate(() => window.previewEvents)
	}

	receivedMessages(page: Page | Frame = this.page) {
		return page.evaluate(() => window.receivedMessages)
	}

	/** Reads a cookie of the website, decoded. */
	async cookie(name: string, url = this.url) {
		const cookie = (await this.page.context().cookies(url)).find((cookie) => cookie.name === name)
		return cookie && { ...cookie, value: decodeURIComponent(cookie.value) }
	}

	/** Reads the repository's ref from the preview cookie, like a Prismic SDK. */
	async previewRef(url = this.url) {
		return readPreviewRef((await this.cookie(previewCookieName, url))?.value, this.repository.host)
	}

	async route() {
		const origins = [this.url, "http://localhost:3000"]
		await this.page.context().route(
			(url) => origins.includes(url.origin),
			(route) => this.handle(route),
		)
	}

	private async handle(route: Route) {
		if (route.request().resourceType() !== "document") return route.fulfill({ status: 404 })

		const cookies = (await route.request().allHeaders()).cookie?.split("; ") ?? []
		const cookie = cookies.find((cookie) => cookie.startsWith(`${previewCookieName}=`))
		const ref = readPreviewRef(
			cookie && decodeURIComponent(cookie.slice(previewCookieName.length + 1)),
			this.repository.host,
		)
		this.loads.push(ref ?? null)
		await route.fulfill({ contentType: "text/html", body: websiteHTML(ref, this.events) })
	}
}

function readPreviewRef(cookie: string | undefined, repository: string): string | undefined {
	if (!cookie) return undefined
	try {
		const value: unknown = JSON.parse(cookie)
		if (typeof value === "object" && value) {
			return (value as Record<string, { preview?: string } | undefined>)[repository]?.preview
		}
	} catch {}
	return cookie
}

function websiteHTML(ref: string | undefined, events: Website["events"]) {
	const recorder = `<script>
		window.previewEvents = []
		for (const type of ["prismicPreviewStart", "prismicPreviewUpdate", "prismicPreviewEnd"]) {
			addEventListener(type, (event) => {
				previewEvents.push([type, event.detail?.ref ?? null])
				${events === "handle" ? "event.preventDefault()" : ""}
			})
		}
	</script>`

	return `<!doctype html>
<meta charset="utf-8" />
<title>Website</title>
<style>
	body { margin: 0; height: 2400px; font: 16px sans-serif; }
	/* The toolbar must not inherit website styles. */
	.title { color: rgb(255, 0, 0); }
	#first-slice { height: 400px; padding: 24px; }
	#outside-slices { height: 100px; }
	#second-slice { height: 300px; padding: 24px; }
</style>
<body>
<!--prismic-slice-start:first-slice-->
<section id="first-slice">
	<h1 class="title">Customer content</h1>
	<p id="content">${ref ? `Draft content: ${ref}` : "Published content"}</p>
</section>
<!--prismic-slice-end:first-slice-->
<div id="outside-slices">Outside slices</div>
<!--prismic-slice-start:second-slice-->
<section id="second-slice">Second slice</section>
<!--prismic-slice-end:second-slice-->
<script>
	window.receivedMessages = []
	addEventListener("message", (event) => receivedMessages.push(event.data?.type))
</script>
${events === "ignore" ? "" : recorder}
<script async defer src="https://static.cdn.prismic.io/prismic.js?new=true&repo=toolbar-e2e"></script>`
}

/** Comment threads, as the editor sends them. */
const author = { id: "author", name: "Test Author", avatarUrl: "/missing-avatar" }
export const comments = {
	pins: [
		{ threadId: "first", xRatio: 0.1, yRatio: 0.1, author, resolved: false },
		{ threadId: "last", xRatio: 0.8, yRatio: 0.9, author, resolved: true },
	],
	draftAuthor: author,
}

interface EditorOptions {
	/** `poll` previews a website without live editing. */
	mode?: "push" | "poll"
	/** The editor's origin. Only Prismic origins can drive the preview. */
	origin?: string
	website?: string
	/** The comment overlay's initial state. */
	comments?: Record<string, unknown>
	page?: Page
}

/** The Prismic editor's live preview, framing the website. */
export class Editor {
	private options: Required<Omit<EditorOptions, "page">>

	constructor(
		public page: Page,
		private readonly website: Website,
		private readonly repository: Repository,
	) {
		this.options = { mode: "push", origin: repository.url, website: website.url, comments: {} }
	}

	/** The previewed website. */
	get preview() {
		return this.page.frameLocator("iframe")
	}

	get previewFrame() {
		const frame = this.page.mainFrame().childFrames()[0]
		if (!frame) throw new Error("The editor has no preview.")
		return frame
	}

	get overlay() {
		return this.preview.locator("#prismic-embedded-preview-overlay")
	}

	async goto({ page = this.page, ...options }: EditorOptions = {}) {
		this.page = page
		this.options = { ...this.options, website: this.website.url, ...options }
		await page.goto(`${this.options.origin}/builder`)
	}

	send(message: { type: string; [key: string]: unknown }) {
		return this.page.evaluate((message) => window.editor.send(message), message)
	}

	updateComments(patch: Record<string, unknown>) {
		return this.page.evaluate((patch) => window.editor.updateComments(patch), patch)
	}

	messages(type: string) {
		return this.page.evaluate(
			(type) =>
				window.editor.messages.filter(
					(message) => message.type === `prismic:embedded-preview:${type}`,
				),
			type,
		)
	}

	async route() {
		const origins = [this.repository.url, "https://editor.test"]
		await this.page.context().route(
			(url) => origins.includes(url.origin) && url.pathname === "/builder",
			(route) => route.fulfill({ contentType: "text/html", body: editorHTML(this.options) }),
		)
	}
}

function editorHTML({ mode, website, comments }: Required<Omit<EditorOptions, "page">>) {
	const name = mode === "poll" ? "prismic:embedded-preview:poll" : "prismic:embedded-preview"

	return `<!doctype html>
<meta charset="utf-8" />
<title>Prismic editor</title>
<style>
	body { margin: 0; }
	iframe { width: 100%; height: 700px; border: 0; }
</style>
<iframe name="${name}" src="${website}"></iframe>
<script>
	const frame = document.querySelector("iframe")
	const origin = new URL(frame.src).origin
	const editor = (window.editor = {
		messages: [],
		comments: {
			type: "prismic:embedded-preview:set-comment-overlay",
			placementEnabled: false,
			pins: [],
			...${JSON.stringify(comments)},
		},
		send: (message) => frame.contentWindow.postMessage(message, origin),
		updateComments(patch) {
			Object.assign(editor.comments, patch)
			for (const key in patch) if (patch[key] === undefined) delete editor.comments[key]
			editor.send(editor.comments)
		},
	})
	// Like the Prismic editor: it acknowledges the preview and controls pin selection.
	addEventListener("message", ({ source, data }) => {
		if (source !== frame.contentWindow) return
		editor.messages.push(data)
		if (data.type === "prismic:embedded-preview:ready") {
			editor.send({ type: "prismic:embedded-preview:ack" })
			editor.send(editor.comments)
		} else if (data.type === "prismic:embedded-preview:select-pin") {
			editor.updateComments({ selectedThreadId: data.pin.threadId })
		} else if (data.type === "prismic:embedded-preview:deselect-pin") {
			editor.updateComments({ selectedThreadId: undefined, draftPin: undefined })
		}
	})
</script>`
}

export const test = base.extend<{ repository: Repository; website: Website; editor: Editor }>({
	// Serves the toolbar at its production URLs and fails on any other request.
	context: async ({ context }, use) => {
		const unexpected: string[] = []
		await context.route("**/*", (route) => {
			unexpected.push(route.request().url())
			return route.abort()
		})
		await context.route(
			(url) => url.href.startsWith("https://static.cdn.prismic.io/prismic.js?"),
			(route) => route.fulfill({ path: toolbarFile("prismic.js") }),
		)
		await context.route(`https://prismic.io/prismic-toolbar/${version}/*.js`, (route) =>
			route.fulfill({
				path: toolbarFile(new URL(route.request().url()).pathname.split("/").at(-1)!),
			}),
		)

		await use(context)

		expect(unexpected, "Unexpected requests").toEqual([])
	},
	page: async ({ page }, use) => {
		const errors: string[] = []
		page.on("pageerror", (error) => errors.push(error.message))

		await use(page)

		expect(errors, "Uncaught errors").toEqual([])
	},
	repository: async ({ context }, use) => {
		const repository = new Repository(context)
		await repository.route()
		await use(repository)
	},
	website: async ({ page, repository }, use) => {
		const website = new Website(page, repository)
		await website.route()
		await use(website)
	},
	editor: async ({ page, website, repository }, use) => {
		const editor = new Editor(page, website, repository)
		await editor.route()
		await use(editor)
	},
})

export { expect }
