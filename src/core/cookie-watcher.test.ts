import Cookies from "js-cookie"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { watchCookie } from "./cookie-watcher"

const name = "watched-cookie"
const stops: (() => void)[] = []
const visibility = (state: DocumentVisibilityState) =>
	Object.defineProperty(document, "visibilityState", { value: state, configurable: true })

beforeEach(() => {
	vi.useFakeTimers()
	visibility("visible")
})

afterEach(() => {
	for (const stop of stops.splice(0)) stop()
	vi.useRealTimers()
	Cookies.remove(name, { path: "/" })
	delete (window as { cookieStore?: unknown }).cookieStore
})

it("polls for changes and deletions while the page is visible", async () => {
	const onChange = vi.fn()
	const stop = watchCookie(name, onChange)

	Cookies.set(name, "first")
	await vi.advanceTimersByTimeAsync(1000)
	expect(onChange).toHaveBeenCalledTimes(1)

	visibility("hidden")
	Cookies.remove(name)
	await vi.advanceTimersByTimeAsync(1000)
	expect(onChange).toHaveBeenCalledTimes(1)

	visibility("visible")
	await vi.advanceTimersByTimeAsync(250)
	expect(onChange).toHaveBeenCalledTimes(2)

	stop()
	Cookies.set(name, "after-stop")
	await vi.advanceTimersByTimeAsync(1000)
	expect(onChange).toHaveBeenCalledTimes(2)
})

it("uses Cookie Store change events instead of polling when available", async () => {
	const cookieStore = new EventTarget()
	Object.defineProperty(window, "cookieStore", { value: cookieStore, configurable: true })
	const onChange = vi.fn()
	stops.push(watchCookie(name, onChange))

	Cookies.set(name, "pushed")
	await vi.advanceTimersByTimeAsync(1000)
	expect(onChange).not.toHaveBeenCalled()

	cookieStore.dispatchEvent(new Event("change"))
	cookieStore.dispatchEvent(new Event("change"))
	expect(onChange).toHaveBeenCalledOnce()
})
