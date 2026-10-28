import { readFileSync } from "node:fs"

import type { InlineConfig, Plugin } from "vite"

import packageJSON from "./package.json" with { type: "json" }

// Asset folder name: the commit's short SHA in production, `pr-<number>` for pull request previews,
// and the last SHA deployed from master locally (see `scripts/dev.ts`).
export const version = process.env.TOOLBAR_VERSION || packageJSON.version

/**
 * Each entry builds `src/<entry>.ts` into `<entry>.js`, except the shell, inlined into
 * `shell.html`.
 */
export const entries = ["prismic", "v5", "embedded-preview", "toolbar", "shell"] as const

export type Entry = (typeof entries)[number]

const oxc = { jsx: { runtime: "automatic", importSource: "preact" } } as const

/** Build-time constants, declared where they are used. */
function defines(development: boolean) {
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

/** Inlines the shell's script into `shell.html`, so the repository host serves a single file. */
const inlineShell: Plugin = {
	name: "inline-shell",
	generateBundle(_options, bundle) {
		const script = bundle["shell.js"]
		if (script?.type !== "chunk") throw new Error("Missing shell script")

		const template = readFileSync("src/shell.html", "utf8")
		this.emitFile({
			type: "asset",
			fileName: "shell.html",
			source: template.replace(
				'<script src="shell?_inline"></script>',
				() => `<script>${script.code.replace(/<\/script/gi, "<\\/script")}</script>`,
			),
		})
		delete bundle["shell.js"]
	},
}

/** Builds one entry as a self-contained classic script, used by `scripts/build.ts`. */
export function entryConfig(entry: Entry, development: boolean): InlineConfig {
	return {
		configFile: false,
		oxc,
		define: defines(development),
		build: {
			outDir: `dist/prismic-toolbar/${version}`,
			emptyOutDir: false,
			// No module loader or shared chunks on customer pages: the CDN sends no CORS headers.
			lib: {
				entry: `src/${entry}.ts`,
				formats: ["iife"],
				name: `PrismicToolbar_${entry.replace(/\W/g, "_")}`,
				fileName: () => `${entry}.js`,
			},
			minify: !development,
			sourcemap: development ? "inline" : false,
			watch: development ? {} : null,
		},
		plugins: entry === "shell" ? [inlineShell] : [],
	}
}
