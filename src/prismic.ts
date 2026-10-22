import { loadChunk, type EmbeddedPreviewOptions } from "./lib/chunks"
import { getCookie } from "./lib/cookie"
import { createEmbeddedPush } from "./lib/embedded-push"
import {
	detectMode,
	findRepositoryHost,
	findVersion,
	repositoryOrigin,
	warn,
	type ToolbarMode,
} from "./lib/env"
import { dispatchPreviewEvent } from "./lib/events"
import { createPreviewSession } from "./lib/preview-session"
import { connectShell } from "./lib/shell-client"
import { createSiteCookieStore, refFor, sessionCookieName } from "./lib/site-cookie"
import { startV4 } from "./v4"

// Replaced at build time, see `vite.config.ts`.
/** Origin the toolbar's versioned assets are served from, such as `https://prismic.io`. */
declare const CDN_HOST: string
/** The asset folder, such as a commit's short SHA or `pr-<number>`. See `vite.config.ts`. */
declare const __TOOLBAR_VERSION__: string

// The script's parameters must be read now: `document.currentScript` is only set while it first runs.
const mode = detectMode()
const repositoryHost = findRepositoryHost()
const requestedVersion = findVersion()

if (mode) {
	if (repositoryHost) start(mode, repositoryHost)
	else {
		warn(`Add your repository name to the toolbar script, for example:

<script async defer src="https://static.cdn.prismic.io/prismic.js?repo=example-repository"></script>`)
	}
}

function start(mode: ToolbarMode, repositoryHost: string) {
	const version = __TOOLBAR_VERSION__
	const assets = `${CDN_HOST}/prismic-toolbar/${version}`
	const connect = () =>
		connectShell(`${repositoryOrigin(repositoryHost)}/prismic-toolbar/${version}/shell.html`)

	// The editor drives embedded modes, whatever the website's SDK opts into.
	if (mode === "embedded-push") {
		void setupEmbeddedPreview(assets, { onRef: createEmbeddedPush({ repositoryHost }) })
		return
	}

	if (mode === "embedded-poll") {
		void setupEmbeddedPreview(assets)
		void createPreviewSession({
			repositoryHost,
			codec: "plain",
			watchCookie: false,
			connect,
		}).start()
		return
	}

	if (requestedVersion === "5") {
		if (getCookie(sessionCookieName)) {
			loadChunk(`${assets}/v5.js`, "startV5")
				.then((startV5) => startV5(repositoryHost))
				.catch((error: unknown) => warn(`Could not load the preview.\n\n${String(error)}`))
			return
		}
		// A preview without a session, like a v4 one from before the website's SDK sent `v=5`, has no
		// bar to exit it.
		const store = createSiteCookieStore(repositoryHost)
		if (!refFor(store.read(), repositoryHost)) return
		store.removeOwn()
		// Reloading with a cookie the toolbar cannot delete would loop.
		const removed = !refFor(store.read(), repositoryHost)
		if (dispatchPreviewEvent("prismicPreviewEnd") && removed) window.location.reload()
		return
	}

	startV4({ repositoryHost, assets, connect })
}

async function setupEmbeddedPreview(assets: string, options?: EmbeddedPreviewOptions) {
	try {
		const setup = await loadChunk(`${assets}/embedded-preview.js`, "setupEmbeddedPreview")
		await setup(options)
	} catch (error) {
		console.error("Failed to load embedded preview.", error)
	}
}
