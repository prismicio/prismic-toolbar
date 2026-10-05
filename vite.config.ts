import { readFileSync } from "node:fs"

import type { InlineConfig, Plugin } from "vite"
import { defineConfig } from "vitest/config"

import packageJSON from "./package.json" with { type: "json" }

// Asset folder name. Pull request previews build into `pr-<number>` instead of the version.
export const version = process.env.TOOLBAR_VERSION || packageJSON.version

export const entries = {
	prismic: "src/loader/index.ts",
	"embedded-preview": "src/toolbar/embedded-preview/index.ts",
	toolbar: "src/toolbar/bar/index.tsx",
	iframe: "src/iframe/index.ts",
}

export type Entry = keyof typeof entries

const oxc = { jsx: { runtime: "automatic", importSource: "preact" } } as const

/** Build-time constants declared in `src/globals.d.ts`. */
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

/** Inlines the iframe's script into `iframe.html`, so the repository host serves a single file. */
const inlineIframeScript: Plugin = {
	name: "inline-iframe-script",
	generateBundle(_options, bundle) {
		const script = bundle["iframe.js"]
		if (script?.type !== "chunk") throw new Error("Missing iframe script")

		const template = readFileSync("src/iframe/index.html", "utf8")
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
}

/** Builds one entry as a self-contained classic script, used by `scripts/build.ts`. */
export function entryConfig(entry: Entry, development: boolean): InlineConfig {
	return {
		configFile: false,
		oxc,
		define: defines(development),
		build: {
			outDir: `build/prismic-toolbar/${version}`,
			emptyOutDir: false,
			// No module loader or shared chunks on customer pages: the CDN sends no CORS headers.
			lib: {
				entry: entries[entry],
				formats: ["iife"],
				name: `PrismicToolbar_${entry.replace(/\W/g, "_")}`,
				fileName: () => `${entry}.js`,
			},
			minify: !development,
			sourcemap: development ? "inline" : false,
			watch: development ? {} : null,
		},
		plugins: entry === "iframe" ? [inlineIframeScript] : [],
	}
}

// Unit tests.
export default defineConfig({
	oxc,
	define: { ...defines(false), __TOOLBAR_LOCAL_EDITOR__: "true" },
	test: {
		environment: "jsdom",
		include: ["tests/**/*.test.ts"],
		setupFiles: ["tests/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["lcovonly", "text"],
			include: ["src"],
		},
	},
})
