// A website with the toolbar installed, built like Prismic's SDKs build them. `FLOW=v5` opts into
// `v=5`. Pages live at `/<repository>/<uid>`, so a fresh browser can open any page.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

import * as prismic from "@prismicio/client"

const port = Number(process.env.PORT)
const v5 = process.env.FLOW === "v5"

createServer((req, res) => {
	handle(req, res).catch((error: unknown) => {
		res.writeHead(500, { "content-type": "text/plain" }).end(String(error))
	})
}).listen(port)

async function handle(req: IncomingMessage, res: ServerResponse) {
	const url = new URL(req.url ?? "/", `http://localhost:${port}`)
	if (url.pathname === "/api/preview") return preview(url, res)

	const [, repository, uid] = url.pathname.split("/")
	if (!repository || !uid) return res.writeHead(404).end()
	// `?with=<repository>/<uid>` shows a page of a second repository, with its own toolbar.
	const pages = [`${repository}/${uid}`, url.searchParams.get("with")].filter(
		(page) => page !== null,
	)
	const sections = await Promise.all(pages.map((page) => render(page, req, pages.length > 1)))

	res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" })
	res.end(`<!doctype html>
<meta charset="utf-8" />
<title>Website</title>
<style>
	body { margin: 0; font: 16px sans-serif; }
	/* The toolbar must not inherit website styles. */
	.title { color: rgb(255, 0, 0); }
	/* Tall enough for the second slice to start below the fold. */
	section { padding: 24px; min-height: 900px; }
	.highlighted { background: #fde68a; }
</style>
${sections.join("\n")}
<script>
	// Pages record preview events. With the \`events=handle\` cookie, they update in place like
	// frameworks do, instead of letting the toolbar reload them.
	window.previewEvents = []
	async function update() {
		const res = await fetch(location.href)
		const next = new DOMParser().parseFromString(await res.text(), "text/html")
		for (const main of document.querySelectorAll("main")) main.replaceWith(next.getElementById(main.id))
	}
	const handle = document.cookie.split("; ").includes("events=handle")
	for (const type of ["prismicPreviewStart", "prismicPreviewUpdate", "prismicPreviewEnd"]) {
		addEventListener(type, (event) => {
			previewEvents.push([type, event.detail?.ref ?? null])
			if (!handle) return
			event.preventDefault()
			update()
		})
	}
</script>
${pages
	.map((page) => {
		const src = `https://static.cdn.prismic.io/prismic.js?repo=${page.split("/")[0]}${v5 ? "&v=5" : ""}`
		return `<script async defer src="${src}"></script>`
	})
	.join("\n")}`)
}

/** Renders a page with the ref of the preview cookie, like SDKs do. */
async function render(page: string, req: IncomingMessage, scoped: boolean) {
	const [repository = "", uid = ""] = page.split("/")
	const client = prismic.createClient(repository)
	// `@prismicio/client` sends the whole cookie, which the Content API reads as a single repository's.
	// Pages showing several repositories read their own entry of the toolbar's cookie instead.
	if (scoped) {
		const ref = repositoryRef(req.headers.cookie, `${repository}.prismic.io`)
		if (ref) client.queryContentFromRef(ref)
	} else {
		client.enableAutoPreviewsFromReq(req)
	}
	// A ref the editor just created can take a moment to reach the Content API.
	const document = await retry(() => client.getByUID("page", uid))
	const slices = document.data.slices.map((slice: prismic.SharedSlice) => {
		const content = `<section class="${slice.variation}"><h2>${slice.primary.text}</h2></section>`
		return `<!--prismic-slice-start:${slice.id}-->${content}<!--prismic-slice-end:${slice.id}-->`
	})

	return `<main id="${repository}">
	<h1 class="title">${document.uid}</h1>
	<p data-testid="payload">${document.data.payload}</p>
	${slices.join("\n\t")}
</main>`
}

async function retry<T>(task: () => Promise<T>, attempts = 10): Promise<T> {
	try {
		return await task()
	} catch (error) {
		if (attempts <= 1) throw error
		await new Promise((resolve) => setTimeout(resolve, 1000))
		return retry(task, attempts - 1)
	}
}

function repositoryRef(cookies = "", host: string): string | undefined {
	const name = `${prismic.cookie.preview}=`
	const cookie = cookies.split("; ").find((cookie) => cookie.startsWith(name))
	try {
		return JSON.parse(decodeURIComponent(cookie?.slice(name.length) ?? ""))[host]?.preview
	} catch {}
}

/** The preview route of SDKs: stores the session's ref, and the session itself with `v=5`. */
async function preview(url: URL, res: ServerResponse) {
	const token = url.searchParams.get("token") ?? ""
	const repository = new URL(token).hostname.split(".")[0] ?? ""
	const client = prismic.createClient(repository)
	const location = await client.resolvePreviewURL({
		documentID: url.searchParams.get("documentId") ?? undefined,
		previewToken: token,
		defaultURL: "/",
		linkResolver: (document) => `/${repository}/${document.uid}`,
	})

	const attributes = v5 ? "; SameSite=None; Secure" : ""
	const cookies = [`${prismic.cookie.preview}=${encodeURIComponent(token)}; Path=/${attributes}`]
	const session = url.searchParams.get("session")
	if (v5 && session) {
		cookies.push(`io.prismic.previewSession=${encodeURIComponent(session)}; Path=/${attributes}`)
	}
	res.writeHead(302, { location, "set-cookie": cookies }).end()
}
