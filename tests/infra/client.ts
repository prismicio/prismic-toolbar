import assert from "node:assert"
import { randomUUID } from "node:crypto"

import { expect, request, type APIRequestContext } from "@playwright/test"

/** Prefix of the repositories tests create, followed by their creation time. */
const prefix = "prismic-toolbar-e2e"

type Auth = { email: string; password: string }

function readAuth(): Auth {
	const { E2E_PRISMIC_EMAIL: email, E2E_PRISMIC_PASSWORD: password } = process.env
	assert(email && password, "Set E2E_PRISMIC_EMAIL and E2E_PRISMIC_PASSWORD, see CONTRIBUTING.md.")
	return { email, password }
}

/** Signs in to Prismic, like the dashboard, so `request` carries the Prismic session cookies. */
export async function signIn(request: APIRequestContext, auth = readAuth()): Promise<void> {
	const res = await request.post("https://prismic.io/authentication/signin", { data: auth })
	assert(res.ok(), "Could not sign in to Prismic. Check your credentials.")
}

/** The Prismic account running the tests. */
export class Prismic {
	readonly #auth: Auth
	readonly #request: APIRequestContext
	readonly #token: string

	private constructor(auth: Auth, request: APIRequestContext, token: string) {
		this.#auth = auth
		this.#request = request
		this.#token = token
	}

	static async signIn(auth = readAuth()): Promise<Prismic> {
		const context = await request.newContext()
		await signIn(context, auth)
		const res = await context.post("https://auth.prismic.io/login", { data: auth })
		assert(res.ok(), "Could not get a Prismic API token.")
		return new Prismic(auth, context, await res.text())
	}

	/** Named after its creation time, so later runs can delete it if this one is interrupted. */
	async createRepository(): Promise<Repository> {
		const domain = `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`
		const res = await this.#request.post("https://prismic.io/authentication/newrepository", {
			data: { domain, framework: "next", plan: "personal", isAnnual: "false", role: "developer" },
		})
		assert(res.ok(), `Could not create repository ${domain}.`)
		return this.repository(domain)
	}

	repository(domain: string): Repository {
		return new Repository(domain, this.#request, this.#token)
	}

	async deleteRepository(domain: string): Promise<void> {
		const remove = () =>
			this.#request.post(`https://${domain}.prismic.io/app/settings/delete`, {
				data: { confirm: domain, password: this.#auth.password },
			})
		// Deleting sometimes fails but succeeds: a second attempt then finds no repository.
		if (!(await remove()).ok()) assert.equal((await remove()).status(), 404)
	}

	/** Deletes repositories that runs started over an hour ago left behind. */
	async deleteStaleRepositories(): Promise<void> {
		const res = await this.#request.get("https://api.internal.prismic.io/user/repositories", {
			headers: { authorization: `Bearer ${this.#token}` },
		})
		assert(res.ok(), "Could not list repositories.")
		const { repositories }: { repositories: { domain: string }[] } = await res.json()
		for (const { domain } of repositories) {
			const createdAt = parseInt(domain.match(new RegExp(`^${prefix}-(\\w+)-`))?.[1] ?? "", 36)
			if (Date.now() - createdAt > 60 * 60 * 1000) await this.deleteRepository(domain)
		}
	}
}

export type Slice = { id: string; variation: "default" | "highlighted"; text: string }

export type Content = {
	/** Shown in the preview bar. */
	title: string
	payload: string
	slices: Slice[]
}

export type Document = { id: string; uid: string; versionId: string; content: Content }

const sliceModel = {
	id: "text_block",
	type: "SharedSlice",
	name: "TextBlock",
	description: "",
	variations: ["Default", "Highlighted"].map((name) => ({
		id: name.toLowerCase(),
		name,
		description: "",
		imageUrl: "",
		docURL: "",
		version: "1",
		primary: { text: { type: "Text", config: { label: "Text" } } },
		items: {},
	})),
}

const pageModel = {
	id: "page",
	label: "Page",
	format: "page",
	repeatable: true,
	status: true,
	json: {
		Main: {
			uid: { type: "UID", config: { label: "UID" } },
			payload: { type: "Text", config: { label: "Payload" } },
			slices: {
				type: "Slices",
				fieldset: "Slice Zone",
				config: { choices: { text_block: { type: "SharedSlice" } } },
			},
		},
	},
}

export class Repository {
	readonly domain: string
	readonly host: string
	readonly url: string
	readonly #request: APIRequestContext
	readonly #headers: Record<string, string>

	constructor(domain: string, request: APIRequestContext, token: string) {
		this.domain = domain
		this.host = `${domain}.prismic.io`
		this.url = `https://${this.host}`
		this.#request = request
		this.#headers = { authorization: `Bearer ${token}`, repository: domain }
	}

	/** Adds the locale, the `page` type, and a preview for each website. */
	async setUp(websites: string[]): Promise<void> {
		const locale = await this.#request.post(
			`${this.url}/app/settings/multilanguages/en-us/createMasterLang`,
		)
		assert(locale.ok(), "Could not set the default locale.")
		for (const [path, model] of [
			["slices/insert", sliceModel],
			["customtypes/insert", pageModel],
		] as const) {
			const res = await this.#request.post(`https://customtypes.prismic.io/${path}`, {
				headers: this.#headers,
				data: model,
			})
			assert(res.ok(), `Could not create ${model.id}.`)
		}
		for (const website of websites) {
			const res = await this.#request.post(`${this.url}/previews/new`, {
				data: { name: website, websiteURL: website, resolverPath: "/api/preview" },
			})
			assert(res.ok(), `Could not add the ${website} preview.`)
		}
	}

	async previewID(website: string): Promise<string> {
		const res = await this.#request.get(`${this.url}/core/repository/preview_configs`, {
			headers: this.#headers,
		})
		const { results }: { results: { id: string; url: string }[] } = await res.json()
		const config = results.find((config) => config.url.startsWith(website))
		assert(config, `No preview for ${website}.`)
		return config.id
	}

	/** Creates and publishes a page, waiting until the Content API serves it. */
	async createDocument(content: Partial<Content> = {}): Promise<Document> {
		const uid = `page-${randomUUID().slice(0, 8)}`
		const full: Content = {
			title: "Spring launch",
			payload: "Published",
			slices: [
				{ id: randomUUID(), variation: "default", text: "First slice" },
				{ id: randomUUID(), variation: "default", text: "Second slice" },
			],
			...content,
		}
		const res = await this.#request.post(`${this.url}/core/documents`, {
			headers: this.#headers,
			data: {
				custom_type_id: "page",
				title: full.title,
				tags: [],
				integration_field_ids: [],
				data: toLegacy(uid, full),
			},
		})
		assert.equal(res.status(), 201, `Could not create a document: ${await res.text()}`)
		const document: { id: string; versions: { version_id: string }[] } = await res.json()
		const doc = { id: document.id, uid, versionId: document.versions[0]!.version_id, content: full }
		await this.publish(doc)
		await this.#waitForContentAPI(doc)
		return doc
	}

	/** Saves a new draft, like the editor, which updates preview sessions of the page. */
	async updateDraft(doc: Document, content: Partial<Content>): Promise<Document> {
		const full = { ...doc.content, ...content }
		const url = `${this.url}/core/documents/${doc.id}/draft?base_version_id=${doc.versionId}`
		const res = await this.#request.put(url, {
			headers: this.#headers,
			data: { data: toLegacy(doc.uid, full), integration_field_ids: [], tags: [] },
		})
		assert(res.ok(), `Could not update ${doc.uid}: ${await res.text()}`)
		const document: { versions: { version_id: string }[] } = await res.json()
		return { ...doc, versionId: document.versions[0]!.version_id, content: full }
	}

	/** Publishing a draft closes its preview sessions. */
	async publish(doc: Document): Promise<void> {
		const res = await this.#request.patch(`${this.url}/core/documents/${doc.id}/draft`, {
			headers: this.#headers,
			data: { status: "published" },
		})
		assert.equal(res.status(), 204, `Could not publish ${doc.uid}: ${await res.text()}`)
	}

	async #waitForContentAPI(doc: Document) {
		const api = `https://${this.domain}.cdn.prismic.io/api/v2`
		const served = async () => {
			const { refs }: { refs: { ref: string; isMasterRef: boolean }[] } = await (
				await this.#request.get(api)
			).json()
			const query = new URLSearchParams({
				ref: refs.find((ref) => ref.isMasterRef)!.ref,
				q: `[[at(document.id,"${doc.id}")]]`,
			})
			const res = await this.#request.get(`${api}/documents/search?${query}`)
			return res.ok() && (await res.json()).results.length > 0
		}
		const message = `The Content API did not serve ${doc.uid} in time.`
		await expect.poll(served, { message, timeout: 30_000 }).toBe(true)
	}
}

/** The Core API's document format, with a type hint next to each field. */
function toLegacy(uid: string, { payload, slices }: Content) {
	return {
		uid,
		uid_TYPE: "UID",
		payload,
		payload_TYPE: "Text",
		slices: slices.map((slice) => ({
			key: `text_block$${slice.id}`,
			value: { variation: slice.variation, primary: { text: slice.text }, items: [] },
		})),
		slices_TYPE: "Slices",
		"slices.text_block_TYPE": "SharedSlice",
		"slices.text_block.primary.text_TYPE": "Text",
	}
}
