import { connectBridge } from "./lib/bridge"
import { loadChunk, type EmbeddedPreviewOptions } from "./lib/chunks"
import { createEmbeddedPush } from "./lib/embedded-push"
import { detectMode, findRepositoryHost, repositoryOrigin, warn, type ToolbarMode } from "./lib/env"
import { createPreviewSession } from "./lib/preview-session"

const mode = detectMode()
const repositoryHost = findRepositoryHost()

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

	const session = createPreviewSession({
		repositoryHost,
		codec: "json",
		watchCookie: true,
		connect,
	})
	// The preview bar only loads once a preview session is active.
	const unsubscribe = session.subscribe((snapshot) => {
		if (snapshot.status !== "polling") return
		unsubscribe()
		loadChunk(`${assets}/toolbar.js`, "mountToolbar")
			.then((mountToolbar) => mountToolbar({ session, repositoryHost }))
			.catch((error: unknown) => warn(`Could not load the preview toolbar.\n\n${String(error)}`))
	})
	void session.start()
}

async function setupEmbeddedPreview(assets: string, options?: EmbeddedPreviewOptions) {
	try {
		const setup = await loadChunk(`${assets}/embedded-preview.js`, "setupEmbeddedPreview")
		await setup(options)
	} catch (error) {
		console.error("Failed to load embedded preview.", error)
	}
}
