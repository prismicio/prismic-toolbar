// Builds the toolbar on change, serves it on port 8081, and runs the playground on port 3000 with it.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"

import { version } from "../vite.config.mjs"

const run = (command, env) =>
	spawn(command, { shell: true, stdio: "inherit", env: { ...process.env, ...env } })

if (!existsSync(new URL("../playground/node_modules", import.meta.url))) {
	await new Promise((resolve, reject) => {
		run("npm install --prefix playground").on("exit", (code) =>
			code ? reject(new Error("Could not install the playground.")) : resolve(),
		)
	})
}

// Ctrl+C reaches every process started from the terminal, so these stop with this script.
run("npm start")
run("npm run serve")
run("npm run dev --prefix playground", {
	TOOLBAR_SRC: `http://localhost:8081/prismic-toolbar/${version}/prismic.js`,
})
