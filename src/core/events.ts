/**
 * Cancelable window events. Frameworks cancel them to update the page themselves; when nothing
 * cancels them, the toolbar reloads the page.
 */
export const previewEvents = {
	/** A preview session starts on a page that does not show it yet. Detail: `{ ref }`. */
	start: "prismicPreviewStart",
	/** The preview ref changed. Detail: `{ ref }`. */
	update: "prismicPreviewUpdate",
	/** The preview ended. Detail: `null`. */
	end: "prismicPreviewEnd",
} as const

export type PreviewEventName = (typeof previewEvents)[keyof typeof previewEvents]

/** Dispatches a preview event and returns `true` when nothing cancelled it. */
export function dispatchPreviewEvent(
	name: typeof previewEvents.start | typeof previewEvents.update,
	detail: { ref: string },
): boolean
export function dispatchPreviewEvent(name: typeof previewEvents.end): boolean
export function dispatchPreviewEvent(name: PreviewEventName, detail?: { ref: string }): boolean {
	return window.dispatchEvent(new CustomEvent(name, { detail: detail ?? null, cancelable: true }))
}
