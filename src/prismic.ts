import { loadChunk } from "./lib/chunks"
import { getCookie } from "./lib/cookie"
import { detectMode, findRepositoryHost, findVersion, warn, type ToolbarMode } from "./lib/env"
import { previewCookieName, sessionCookieName } from "./lib/site-cookie"

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
	let chunk: string
	// The editor drives embedded modes, whatever the website's SDK opts into.
	if (mode !== "regular") chunk = "embedded-preview"
	// v4 only knows whether a preview is active once the repository's shell answers.
	else if (requestedVersion !== "5") chunk = "v4"
	else if (getCookie(sessionCookieName) || getCookie(previewCookieName)) chunk = "v5"
	else return

	loadChunk(`${CDN_HOST}/prismic-toolbar/${__TOOLBAR_VERSION__}/${chunk}.js`, {
		repositoryHost,
		mode,
	})
}
