// Builds the toolbar on change, serves it on port 8081, and runs the playground on port 3000 with it.
import { execFileSync, spawn } from "node:child_process"
import { existsSync } from "node:fs"

import { version as packageVersion } from "../vite.config"

// Local builds have no iframe on the repository host: reuse the last one deployed from master.
const version = process.env.TOOLBAR_VERSION || lastDeployedVersion() || packageVersion

const run = (command: string, env?: Record<string, string>) =>
	spawn(command, { shell: true, stdio: "inherit", env: { ...process.env, ...env } })

if (!existsSync("playground/node_modules")) {
	await new Promise<void>((resolve, reject) => {
		run("npm install --prefix playground").on("exit", (code) =>
			code ? reject(new Error("Could not install the playground.")) : resolve(),
		)
	})
}

// Ctrl+C reaches every process started from the terminal, so these stop with this script.
run("npx tsx scripts/build.ts --watch", { TOOLBAR_VERSION: version })
run("npx http-server dist -p 8081 -g -c-1")
run("npm run dev --prefix playground", {
	TOOLBAR_SRC: `http://localhost:8081/prismic-toolbar/${version}/prismic.js`,
})

// Production deploys master commits that change these paths, under their short SHA (see `ci.yml`).
function lastDeployedVersion(): string | undefined {
	try {
		const paths = ["src", "package.json", "package-lock.json", "vite.config.ts", "scripts/build.ts"]
		const sha = execFileSync("git", ["log", "-1", "--format=%H", "origin/master", "--", ...paths], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		})
		return sha.slice(0, 8) || undefined
	} catch {
		return undefined
	}
}
