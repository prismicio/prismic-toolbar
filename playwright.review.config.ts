import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/review",
	use: { ...devices["Desktop Chrome"] },
})
