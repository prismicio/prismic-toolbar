import Cookies from "js-cookie"

/**
 * Calls `onChange` when a cookie's value changes, including changes from other tabs or the editor's
 * iframe. Uses Cookie Store change events when available, and polls while the page is visible
 * otherwise. Returns a function that stops watching.
 */
export function watchCookie(name: string, onChange: () => void): () => void {
	let lastValue = Cookies.get(name)
	const check = () => {
		const value = Cookies.get(name)
		if (value === lastValue) return
		lastValue = value
		onChange()
	}

	const cookieStore = (window as { cookieStore?: EventTarget }).cookieStore
	if (cookieStore) {
		cookieStore.addEventListener("change", check)
		return () => cookieStore.removeEventListener("change", check)
	}

	const timer = setInterval(() => {
		if (document.visibilityState === "visible") check()
	}, 250)
	return () => clearInterval(timer)
}
