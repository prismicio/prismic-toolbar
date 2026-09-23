import { useLayoutEffect, useMemo, useState } from "preact/hooks"

import { createSelectSliceMessage } from "../message-protocol"
import type { PostMessage } from "../message-protocol"
import { findSliceAtElement } from "./slice-overlay-geometry"
import type { Slice } from "./slice-overlay-geometry"

interface SliceOverlayProps {
	postMessage: PostMessage
	slices: Slice[]
}

export function SliceOverlay({ postMessage, slices }: SliceOverlayProps) {
	const [target, setTarget] = useState<Element | null>(null)

	// Slice highlights remain pointer-transparent so they do not block the preview. Hover and slice
	// selection therefore use document events. Interactive controls added to a highlight should use
	// `pointer-events: auto` and regular `onClick` handlers because they intentionally cover the page.
	useLayoutEffect(() => {
		function track(event: PointerEvent) {
			setTarget(event.target instanceof Element ? event.target : null)
		}

		function clear() {
			setTarget(null)
		}

		document.addEventListener("pointermove", track, { passive: true })
		document.addEventListener("pointerover", track, { passive: true })
		document.documentElement.addEventListener("pointerleave", clear)
		window.addEventListener("blur", clear)

		return () => {
			document.removeEventListener("pointermove", track)
			document.removeEventListener("pointerover", track)
			document.documentElement.removeEventListener("pointerleave", clear)
			window.removeEventListener("blur", clear)
		}
	}, [])

	useLayoutEffect(() => {
		function selectSlice(event: MouseEvent) {
			// Don't select a slice if the user is interacting with the UI or has selected text.
			if (event.defaultPrevented || window.getSelection()?.isCollapsed === false) return

			const target = event.target instanceof Element ? event.target : null
			if (!target) return

			const slice = findSliceAtElement(slices, target)
			if (!slice) return

			event.preventDefault()
			event.stopPropagation()

			postMessage(createSelectSliceMessage(slice.sliceId))
		}

		document.addEventListener("click", selectSlice)

		return () => document.removeEventListener("click", selectSlice)
	}, [postMessage, slices])

	const slice = useMemo(() => findSliceAtElement(slices, target), [slices, target])
	if (!slice) return null

	return <SliceHighlight slice={slice} />
}

interface SliceHighlightProps {
	slice: Slice
}

function SliceHighlight(props: SliceHighlightProps) {
	const { slice } = props
	const { sliceId, rect } = slice

	if (!rect) return null

	return (
		<div
			className="slice-highlight"
			data-slice-id={sliceId}
			style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
		/>
	)
}
