import { existsSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { defineConfig, devices } from "@playwright/test"

try {
	process.loadEnvFile(".env.test.local")
} catch {}

/** The Prismic login and the repositories the setup project created. */
export const STORAGE_STATE = fileURLToPath(
	new URL("./tests/infra/.storage-state.json", import.meta.url),
)
if (!existsSync(STORAGE_STATE)) writeFileSync(STORAGE_STATE, JSON.stringify({}))

/** One website per toolbar flow, run by `tests/website/server.ts`. */
export const websites = { v4: 4421, v5: 4422 }

// https://playwright.dev/docs/test-configuration
export default defineConfig({
	testDir: "./tests",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Each worker previews its own repositories: see `tests/infra/setup.ts`.
	workers: 4,
	// Previews follow Prismic every 3 seconds.
	timeout: 60_000,
	expect: { timeout: 15_000 },
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		...devices["Desktop Chrome"],
		viewport: { width: 1280, height: 900 },
		storageState: STORAGE_STATE,
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "setup", testMatch: "infra/setup.ts", teardown: "teardown" },
		{ name: "teardown", testMatch: "infra/teardown.ts" },
		...Object.entries(websites).map(([name, port]) => ({
			name,
			// Specs named after a flow only run on its website.
			testIgnore: Object.keys(websites)
				.filter((other) => other !== name)
				.map((other) => `**/${other}.spec.ts`),
			dependencies: ["setup"],
			use: { baseURL: `http://localhost:${port}` },
		})),
	],
	webServer: Object.entries(websites).map(([name, port]) => ({
		command: `node tests/website/server.ts`,
		env: { PORT: String(port), FLOW: name },
		port,
		reuseExistingServer: !process.env.CI,
	})),
})

declare global {
	// oxlint-disable-next-line typescript/no-namespace
	namespace NodeJS {
		interface ProcessEnv {
			E2E_PRISMIC_EMAIL?: string
			E2E_PRISMIC_PASSWORD?: string
		}
	}
}
