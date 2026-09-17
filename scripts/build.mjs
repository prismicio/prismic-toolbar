import { rm } from "node:fs/promises"

import { build } from "vite"

import { entries, entryConfig } from "../vite.config.mjs"

const development = process.argv.includes("--watch")

await rm(new URL("../build", import.meta.url), { recursive: true, force: true })

for (const entry of Object.keys(entries)) {
	await build(entryConfig(entry, development))
}
