/**
 * Cancelable window events. Frameworks cancel them to update the page themselves; otherwise the
 * toolbar reloads the page.
 */
export type PreviewEvent = "prismicPreviewStart" | "prismicPreviewUpdate" | "prismicPreviewEnd"

/** Dispatches a preview event with `{ ref }`, or `null`, and returns `true` unless it was cancelled. */
export function dispatchPreviewEvent(name: PreviewEvent, ref?: string): boolean {
	const detail = ref === undefined ? null : { ref }
	return window.dispatchEvent(new CustomEvent(name, { detail, cancelable: true }))
}
