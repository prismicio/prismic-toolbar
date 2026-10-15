/**
 * Cancelable window events. Frameworks cancel them to update the page themselves; otherwise the
 * toolbar reloads the page.
 */
export type PreviewEvent = "prismicPreviewStart" | "prismicPreviewUpdate" | "prismicPreviewEnd"

/** Dispatches a preview event with `{ ref }`, or `null`, and returns `true` unless it was cancelled. */
export function dispatchPreviewEvent(name: PreviewEvent, ref?: string): boolean {
	const detail = ref === undefined ? null : { ref }
	const dispatch = (type: PreviewEvent) =>
		window.dispatchEvent(new CustomEvent(type, { detail, cancelable: true }))

	// Integrations older than v5 only handle `prismicPreviewUpdate`: give them a chance before reloading.
	return dispatch(name) && (name !== "prismicPreviewStart" || dispatch("prismicPreviewUpdate"))
}
