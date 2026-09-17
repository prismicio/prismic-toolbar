import { defineConfig } from "vitest/config"

import shared from "./vite.config.mjs"

export default defineConfig({
	...shared,
	test: { environment: "jsdom", include: ["tests/unit/**/*.test.ts"], restoreMocks: true },
})
