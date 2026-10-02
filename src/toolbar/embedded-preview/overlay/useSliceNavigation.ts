import { useStableCallback } from "@toolbar/support/react"
import { useLayoutEffect, useState } from "preact/hooks"

import {
	isOverlayScaleMessage,
	isScrollToPinMessage,
	isScrollToSliceMessage,
	isSelectedSliceMessage,
} from "../message-protocol"
import type { SubscribeToMessages } from "../message-protocol"
import { scrollToSlice } from "./scroll-to-slice"
import type { Slice } from "./slice-overlay-geometry"

export function useSliceNavigation(
	slices: Slice[],
	uiScale: number,
	subscribeToMessages: SubscribeToMessages,
) {
	const [selectedSliceId, setSelectedSliceId] = useState<string>()
	const reveal = useStableCallback((sliceId: string) => {
		const slice = slices.find((slice) => slice.sliceId === sliceId)
		if (slice) scrollToSlice(slice, uiScale)
	})

	useLayoutEffect(() => {
		let pendingSliceId: string | undefined
		let timeout: number | undefined
		function cancel() {
			window.clearTimeout(timeout)
			pendingSliceId = undefined
		}
		function schedule() {
			if (!pendingSliceId) return
			window.clearTimeout(timeout)
			// Opening fields resizes the iframe. Scroll after its size has settled.
			timeout = window.setTimeout(() => {
				const sliceId = pendingSliceId
				cancel()
				if (sliceId) reveal(sliceId)
			}, 100)
		}
		function onMessage({ data }: MessageEvent<unknown>) {
			if (isSelectedSliceMessage(data)) {
				setSelectedSliceId(data.selectedSliceId)
				if (pendingSliceId !== data.selectedSliceId) cancel()
			} else if (isScrollToSliceMessage(data)) {
				pendingSliceId = data.sliceId
				schedule()
			} else if (isOverlayScaleMessage(data)) {
				schedule()
			} else if (isScrollToPinMessage(data)) {
				cancel()
			}
		}
		const unsubscribe = subscribeToMessages(onMessage)
		const controller = new AbortController()
		window.addEventListener("resize", schedule, { signal: controller.signal })
		for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
			window.addEventListener(event, cancel, { capture: true, signal: controller.signal })
		}
		return () => {
			cancel()
			unsubscribe()
			controller.abort()
		}
	}, [subscribeToMessages, reveal])

	return selectedSliceId
}
