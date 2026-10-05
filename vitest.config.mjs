import { defineConfig } from "vitest/config"

import shared, { defines } from "./vite.config.mjs"

export default defineConfig({
	...shared,
	define: { ...defines(), __TOOLBAR_LOCAL_EDITOR__: "true" },
	test: { environment: "jsdom", include: ["src/**/*.test.ts"], restoreMocks: true },
})
