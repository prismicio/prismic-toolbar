import { startLegacy } from "./legacy"
import { connectBridge } from "./lib/bridge"
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
import { createPreviewSession } from "./lib/preview-session"
import { sessionCookieName } from "./lib/site-cookie"

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

<script async defer src="https://static.cdn.prismic.io/prismic.js?new=true&repo=example-repository"></script>`)
	}
}

function start(mode: ToolbarMode, repositoryHost: string) {
	const version = __TOOLBAR_VERSION__
	const assets = `${CDN_HOST}/prismic-toolbar/${version}`
	const connect = () =>
		connectBridge(`${repositoryOrigin(repositoryHost)}/prismic-toolbar/${version}/iframe.html`)

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
			loadChunk(`${assets}/modern.js`, "startModern")
				.then((startModern) => startModern({ repositoryHost, assets }))
				.catch((error: unknown) => warn(`Could not load the preview.\n\n${String(error)}`))
		}
		return
	}

	startLegacy({ repositoryHost, assets, connect })
}

async function setupEmbeddedPreview(assets: string, options?: EmbeddedPreviewOptions) {
	try {
		const setup = await loadChunk(`${assets}/embedded-preview.js`, "setupEmbeddedPreview")
		await setup(options)
	} catch (error) {
		console.error("Failed to load embedded preview.", error)
	}
}
