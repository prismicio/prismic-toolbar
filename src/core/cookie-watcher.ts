import { getCookie } from "./cookie"

export interface CookieWatcher {
	start(): void
	stop(): void
	/** Compares the cookie with its last known value now. */
	check(): void
}

interface CookieStoreLike extends EventTarget {}
interface CookieChangeEventLike extends Event {
	changed: ReadonlyArray<{ name?: string }>
	deleted: ReadonlyArray<{ name?: string }>
}

/**
 * Reports changes to a cookie made outside this page, such as an editor push or another tab. Uses
 * Cookie Store change events when available, and polls while the page is visible otherwise. The
 * callback also sees this page's own writes; callers ignore those by comparing values.
 */
export function createCookieWatcher({
	name,
	onChange,
	interval = 250,
}: {
	name: string
	onChange: (value: string | undefined) => void
	interval?: number
}): CookieWatcher {
	const cookieStore = (window as { cookieStore?: CookieStoreLike }).cookieStore
	let lastValue = getCookie(name)
	let timer: ReturnType<typeof setInterval> | undefined
	let started = false

	function check() {
		const value = getCookie(name)
		if (value === lastValue) return
		lastValue = value
		onChange(value)
	}

	function handleCookieChange(event: Event) {
		const { changed, deleted } = event as CookieChangeEventLike
		if ([...changed, ...deleted].some((cookie) => cookie.name === name)) check()
	}

	function updatePolling() {
		if (cookieStore) return
		const shouldPoll = started && document.visibilityState === "visible"
		if (shouldPoll && !timer) timer = setInterval(check, interval)
		if (!shouldPoll && timer) {
			clearInterval(timer)
			timer = undefined
		}
	}

	function handleVisibilityChange() {
		if (document.visibilityState === "visible") check()
		updatePolling()
	}

	return {
		check,

		start() {
			if (started) return
			started = true
			lastValue = getCookie(name)
			cookieStore?.addEventListener("change", handleCookieChange)
			document.addEventListener("visibilitychange", handleVisibilityChange)
			updatePolling()
		},

		stop() {
			started = false
			cookieStore?.removeEventListener("change", handleCookieChange)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			updatePolling()
		},
	}
}
