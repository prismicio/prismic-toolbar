import { afterEach, vi } from "vitest"

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	vi.useRealTimers()
	// By raw name, so cookies with malformed names or values go too.
	for (const cookie of document.cookie.split("; ").filter(Boolean)) {
		document.cookie = `${cookie.split("=")[0]}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
	}
})
