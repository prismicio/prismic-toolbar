import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import browserslistToEsbuild from "browserslist-to-esbuild"
import postcssImport from "postcss-import"
import postcssPresetEnv from "postcss-preset-env"

const relative = (path) => fileURLToPath(new URL(path, import.meta.url))
const packageJSON = JSON.parse(readFileSync(relative("./package.json"), "utf8"))
// Asset folder name. Pull request previews build into `pr-<number>` instead of the version.
export const version = process.env.TOOLBAR_VERSION || packageJSON.version
const browserTargets = browserslistToEsbuild(undefined, { path: relative(".") })

export const entries = {
	prismic: relative("src/loader/index.ts"),
	"embedded-preview": relative("src/toolbar/embedded-preview/index.ts"),
	toolbar: relative("src/toolbar/bar/index.tsx"),
	iframe: relative("src/iframe/index.ts"),
}

const shared = {
	resolve: {
		alias: [
			{ find: "~", replacement: relative("src") },
			{ find: "@common", replacement: relative("src/common") },
			{ find: "@toolbar", replacement: relative("src/toolbar") },
		],
	},
	oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
	css: {
		postcss: {
			plugins: [postcssImport(), postcssPresetEnv({ features: { "nesting-rules": true } })],
		},
	},
}

/** Build-time constants, shared with Vitest. */
export function defines({ development = false } = {}) {
	return {
		CDN_HOST: JSON.stringify(
			process.env.CDN_HOST || (development ? "http://localhost:8081" : "https://prismic.io"),
		),
		__TOOLBAR_VERSION__: JSON.stringify(version),
		__TOOLBAR_LOCAL_EDITOR__: JSON.stringify(
			development || process.env.TOOLBAR_LOCAL_EDITOR === "true",
		),
		"process.env.NODE_ENV": JSON.stringify(development ? "development" : "production"),
	}
}

export function entryConfig(entry, development = false) {
	const plugins = []

	if (entry === "iframe") {
		plugins.push({
			name: "inline-auth-iframe",
			generateBundle(_options, bundle) {
				const script = bundle["iframe.js"]
				if (!script || script.type !== "chunk") {
					throw new Error("Missing auth iframe script")
				}
				const template = readFileSync(relative("src/iframe/index.html"), "utf8")
				this.emitFile({
					type: "asset",
					fileName: "iframe.html",
					source: template.replace(
						'<script src="iframe?_inline"></script>',
						() => `<script>${script.code.replace(/<\/script/gi, "<\\/script")}</script>`,
					),
				})
				delete bundle["iframe.js"]
			},
		})
	}

	return {
		...shared,
		configFile: false,
		define: defines({ development }),
		build: {
			outDir: `build/prismic-toolbar/${version}`,
			emptyOutDir: false,
			// Keep classic scripts self-contained: no module loader or shared chunks on customer pages.
			lib: {
				entry: entries[entry],
				formats: ["iife"],
				name: `PrismicToolbar_${entry.replace(/\W/g, "_")}`,
				fileName: () => `${entry}.js`,
			},
			target: browserTargets,
			cssTarget: browserTargets,
			minify: !development,
			sourcemap: development ? "inline" : false,
			watch: development ? {} : null,
		},
		plugins,
	}
}

export default shared
