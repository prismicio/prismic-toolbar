import { defineConfig } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/browser",
	use: {
		baseURL: "http://localhost:8082",
		viewport: { width: 1280, height: 900 },
		trace: "retain-on-failure",
	},
	webServer: {
		command: "CDN_HOST=http://localhost:8082 npm run build && node tests/fixtures/server.mjs",
		url: "http://localhost:8082",
		reuseExistingServer: false,
	},
	projects: [{ name: "chromium", use: { browserName: "chromium" } }],
})
