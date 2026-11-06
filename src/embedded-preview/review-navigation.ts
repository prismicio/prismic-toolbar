/** Keeps the review panel from placing comments on a different page after navigation. */
export function observeReviewNavigation(postMessage: (message: object) => void) {
	const report = () =>
		postMessage({ type: "prismic:embedded-preview:location", url: window.location.href })
	const navigating = () => postMessage({ type: "prismic:embedded-preview:navigating" })
	for (const method of ["pushState", "replaceState"] as const) {
		const original = window.history[method]
		window.history[method] = function (...args) {
			const result = original.apply(this, args)
			report()
			return result
		}
	}
	window.addEventListener("popstate", report)
	window.addEventListener("hashchange", report)
	window.addEventListener("pagehide", navigating)
	document.addEventListener("click", (event) => {
		if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return
		const link = event.target instanceof Element ? event.target.closest("a[href]") : null
		if (
			link instanceof HTMLAnchorElement &&
			!link.download &&
			(!link.target || link.target === "_self")
		)
			navigating()
	})
	// Also recover when a router cancels a link click or updates history through an earlier reference.
	window.setInterval(report, 500)
	report()
}
