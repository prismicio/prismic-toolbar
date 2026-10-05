import { rm } from "node:fs/promises"

import { build } from "vite"

import { entries, entryConfig, type Entry } from "../vite.config"

const development = process.argv.includes("--watch")

await rm("build", { recursive: true, force: true })

for (const entry of Object.keys(entries) as Entry[]) {
	await build(entryConfig(entry, development))
}
