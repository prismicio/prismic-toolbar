import Cookies from "js-cookie"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createCookieWatcher, type CookieWatcher } from "./cookie-watcher"

const name = "watched-cookie"
const watchers: CookieWatcher[] = []
const watch = (onChange: (value: string | undefined) => void) => {
	const watcher = createCookieWatcher({ name, onChange })
	watchers.push(watcher)
	return watcher
}

beforeEach(() => {
	vi.useFakeTimers()
	Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
})

afterEach(() => {
	for (const watcher of watchers.splice(0)) watcher.stop()
	vi.useRealTimers()
	Cookies.remove(name, { path: "/" })
	delete (window as { cookieStore?: unknown }).cookieStore
})

describe("cookie watcher", () => {
	it("polls for changes and deletions while the page is visible", async () => {
		const onChange = vi.fn()
		const watcher = watch(onChange)
		watcher.start()

		Cookies.set(name, "first")
		await vi.advanceTimersByTimeAsync(250)
		expect(onChange).toHaveBeenLastCalledWith("first")

		await vi.advanceTimersByTimeAsync(1000)
		expect(onChange).toHaveBeenCalledTimes(1)

		Cookies.remove(name)
		await vi.advanceTimersByTimeAsync(250)
		expect(onChange).toHaveBeenLastCalledWith(undefined)

		watcher.stop()
		Cookies.set(name, "after-stop")
		await vi.advanceTimersByTimeAsync(1000)
		expect(onChange).toHaveBeenCalledTimes(2)
	})

	it("pauses while hidden and checks as soon as the page is visible again", async () => {
		const onChange = vi.fn()
		watch(onChange).start()

		Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true })
		document.dispatchEvent(new Event("visibilitychange"))
		Cookies.set(name, "while-hidden")
		await vi.advanceTimersByTimeAsync(1000)
		expect(onChange).not.toHaveBeenCalled()

		Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true })
		document.dispatchEvent(new Event("visibilitychange"))
		expect(onChange).toHaveBeenCalledExactlyOnceWith("while-hidden")
	})

	it("uses Cookie Store change events instead of polling when available", async () => {
		const cookieStore = new EventTarget()
		Object.defineProperty(window, "cookieStore", { value: cookieStore, configurable: true })
		const onChange = vi.fn()
		watch(onChange).start()

		Cookies.set(name, "pushed")
		await vi.advanceTimersByTimeAsync(1000)
		expect(onChange).not.toHaveBeenCalled()

		const change = (cookies: { name: string }[]) =>
			Object.assign(new Event("change"), { changed: cookies, deleted: [] })
		cookieStore.dispatchEvent(change([{ name: "unrelated" }]))
		expect(onChange).not.toHaveBeenCalled()
		cookieStore.dispatchEvent(change([{ name }]))
		expect(onChange).toHaveBeenCalledExactlyOnceWith("pushed")
	})
})
