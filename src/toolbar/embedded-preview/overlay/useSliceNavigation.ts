import { useStableCallback } from "@toolbar/support/react"
import { useLayoutEffect, useRef, useState } from "preact/hooks"

import { isScrollToPinMessage, isScrollToSliceMessage, isSelectedSliceMessage } from "../message-protocol"
import type { SubscribeToMessages } from "../message-protocol"
import { scrollToSlice } from "./scroll-to-slice"
import type { Slice } from "./slice-overlay-geometry"

export function useSliceNavigation(
	slices: Slice[],
	uiScale: number,
	subscribeToMessages: SubscribeToMessages,
) {
	const [selectedSliceId, setSelectedSliceId] = useState<string>()
	const pendingSliceId = useRef<string>()
	const timeout = useRef<number>()
	const cancel = useStableCallback(() => {
		window.clearTimeout(timeout.current)
		pendingSliceId.current = undefined
	})
	const reveal = useStableCallback(() => {
		const slice = slices.find((slice) => slice.sliceId === pendingSliceId.current)
		cancel()
		if (slice) scrollToSlice(slice, uiScale)
	})
	const schedule = useStableCallback(() => {
		if (!pendingSliceId.current) return
		window.clearTimeout(timeout.current)
		// Opening fields resizes the iframe. Scroll after its size has settled.
		timeout.current = window.setTimeout(reveal, 100)
	})
	const onMessage = useStableCallback(({ data }: MessageEvent<unknown>) => {
		if (isSelectedSliceMessage(data)) {
			setSelectedSliceId(data.selectedSliceId)
			if (pendingSliceId.current !== data.selectedSliceId) cancel()
		} else if (isScrollToSliceMessage(data)) {
			pendingSliceId.current = data.sliceId
			schedule()
		} else if (isScrollToPinMessage(data)) {
			cancel()
		}
	})

	useLayoutEffect(() => subscribeToMessages(onMessage), [subscribeToMessages, onMessage])
	useLayoutEffect(schedule, [schedule, uiScale])
	useLayoutEffect(() => {
		const controller = new AbortController()
		window.addEventListener("resize", schedule, { signal: controller.signal })
		for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
			window.addEventListener(event, cancel, { capture: true, signal: controller.signal })
		}
		return () => {
			cancel()
			controller.abort()
		}
	}, [schedule, cancel])

	return selectedSliceId
}
