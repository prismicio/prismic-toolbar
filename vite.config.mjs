import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import browserslistToEsbuild from "browserslist-to-esbuild"
import postcssImport from "postcss-import"
import postcssPresetEnv from "postcss-preset-env"
import postcssUrl from "postcss-url"

const relative = (path) => fileURLToPath(new URL(path, import.meta.url))
export const { version } = JSON.parse(readFileSync(relative("./package.json"), "utf8"))
const browserTargets = browserslistToEsbuild(undefined, { path: relative(".") })

export const entries = {
	prismic: relative("src/toolbar/index.js"),
	overlay: relative("src/toolbar/embedded-preview/overlay.ts"),
	toolbar: relative("src/toolbar/toolbar.jsx"),
	iframe: relative("src/iframe/index.js"),
}

const shared = {
	resolve: {
		alias: [
			{ find: /^react$/, replacement: "preact/compat" },
			{ find: /^react-dom$/, replacement: "preact/compat" },
			{ find: /^react\/jsx-runtime$/, replacement: "preact/jsx-runtime" },
			...Object.entries({
				"~": "src",
				"@common": "src/common",
				"@toolbar": "src/toolbar",
				"@iframe": "src/iframe",
				"@toolbar-service": "src/toolbar-service",
			}).map(([find, path]) => ({ find, replacement: relative(path) })),
		],
	},
	oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
	css: {
		postcss: {
			plugins: [
				postcssImport(),
				postcssUrl({ url: "inline" }),
				postcssPresetEnv({
					features: { "nesting-rules": true },
				}),
			],
		},
	},
}

export function entryConfig(entry, development = false) {
	return {
		...shared,
		configFile: false,
		define: {
			CDN_HOST: JSON.stringify(
				process.env.CDN_HOST || (development ? "http://localhost:8081" : "https://prismic.io"),
			),
			"process.env.npm_package_version": JSON.stringify(version),
			"process.env.NODE_ENV": JSON.stringify(development ? "development" : "production"),
		},
		build: {
			outDir: `build/prismic-toolbar/${version}`,
			emptyOutDir: false,
			// Keep classic scripts self-contained: no module loader or shared chunks on customer pages.
			lib: {
				entry: entries[entry],
				formats: ["iife"],
				name: `Prismic${entry}`,
				fileName: () => `${entry}.js`,
			},
			target: browserTargets,
			cssTarget: browserTargets,
			minify: !development,
			sourcemap: development ? "inline" : false,
			watch: development ? {} : null,
		},
		plugins: [
			{
				name: "preserve-entry-boundaries",
				generateBundle(_options, bundle) {
					for (const output of Object.values(bundle)) {
						if (output.type !== "chunk") continue
						if (
							entry !== "toolbar" &&
							entry !== "overlay" &&
							Object.keys(output.modules).some((id) => /\/node_modules\/preact\//.test(id))
						) {
							throw new Error(`Preact must not be included in ${entry}`)
						}
					}
				},
			},
			...(entry === "iframe"
				? [
						{
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
						},
					]
				: []),
		],
	}
}

export default shared
