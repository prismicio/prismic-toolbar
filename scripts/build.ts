import { rm } from "node:fs/promises"

import { build } from "vite"

import { entries, entryConfig } from "../vite.config"

const development = process.argv.includes("--watch")

await rm("dist", { recursive: true, force: true })

for (const entry of entries) {
	await build(entryConfig(entry, development))
}
