import { defineConfig, devices } from "@playwright/test"

// https://playwright.dev/docs/test-configuration
export default defineConfig({
	testDir: ".",
	testMatch: "**/*.spec.ts",
	globalSetup: "./infra/setup.ts",
	outputDir: "../test-results",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	use: {
		...devices["Desktop Chrome"],
		viewport: { width: 1280, height: 900 },
		trace: "retain-on-failure",
	},
})
