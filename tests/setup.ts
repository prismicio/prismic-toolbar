import Cookies from "js-cookie"
import { afterEach, vi } from "vitest"

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	vi.useRealTimers()
	for (const name of Object.keys(Cookies.get())) Cookies.remove(name, { path: "/" })
})
