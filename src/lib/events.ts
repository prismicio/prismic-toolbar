/**
 * Cancelable window events, the toolbar's contract with websites:
 *
 * - `prismicPreviewStart` and `prismicPreviewUpdate`: the preview cookie already holds `detail.ref`.
 * - `prismicPreviewEnd`: the toolbar already deleted the preview cookies.
 *
 * Cancelling an event means the website updates the page itself. Otherwise, the toolbar reloads it.
 */
export type PreviewEvent = "prismicPreviewStart" | "prismicPreviewUpdate" | "prismicPreviewEnd"

/** Dispatches a preview event with `{ ref }`, or `null`, and returns `true` unless it was cancelled. */
export function dispatchPreviewEvent(name: PreviewEvent, ref?: string): boolean {
	const detail = ref === undefined ? null : { ref }

	const dispatch = (type: PreviewEvent) =>
		window.dispatchEvent(new CustomEvent(type, { detail, cancelable: true }))

	const result = dispatch(name)

	// Integrations older than v5 only handle `prismicPreviewUpdate`: give them a chance before reloading.
	if (result && name === "prismicPreviewStart") {
		return dispatch("prismicPreviewUpdate")
	}

	return result
}
