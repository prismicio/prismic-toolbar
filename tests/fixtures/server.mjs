import { access, readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { resolve } from "node:path"

import { version } from "../../vite.config.mjs"

const fixtures = new URL("./", import.meta.url)
const artifactRoot = process.env.TOOLBAR_BUILD_DIR || resolve(`build/prismic-toolbar/${version}`)
const artifacts = ["prismic.js", "embedded-preview.js", "toolbar.js", "iframe.html"]

for (const name of artifacts) {
	try {
		await access(resolve(artifactRoot, name))
	} catch {
		console.error(
			`Missing ${artifactRoot}/${name}. Run \`npm run build\` before browser tests or fixture server.`,
		)
		process.exit(1)
	}
}

createServer(async (req, res) => {
	try {
		const url = new URL(req.url, "http://localhost:8082")
		const name = url.pathname.split("/").at(-1)
		let body
		if (artifacts.includes(name)) body = await readFile(resolve(artifactRoot, name))
		else if (
			["/", "/toolbar.html", "/overlay.html", "/site.html", "/auth.html"].includes(url.pathname)
		) {
			body = (await readFile(new URL(name || "toolbar.html", fixtures), "utf8")).replaceAll(
				"__VERSION__",
				version,
			)
		} else {
			res.writeHead(404).end()
			return
		}
		res.writeHead(200, {
			"Content-Type": name?.endsWith(".js") ? "text/javascript" : "text/html",
			"Cache-Control": "no-store",
		})
		res.end(body)
	} catch (error) {
		res.writeHead(500).end(String(error))
	}
}).listen(8082, "localhost")
