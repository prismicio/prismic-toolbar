import { useStableCallback } from "@toolbar/support/react"
import { useLayoutEffect, useRef, useState } from "preact/hooks"

import {
	isScrollToPinMessage,
	isSliceOverlayMessage,
	isScrollToSliceMessage,
} from "../message-protocol"
import type { SubscribeToMessages } from "../message-protocol"
import { scrollToSlice } from "./scroll-to-slice"
import type { Slice } from "./slice-overlay-geometry"

export function useSliceOverlay(
	slices: Slice[],
	uiScale: number,
	subscribeToMessages: SubscribeToMessages,
) {
	const [selectedSliceId, setSelectedSliceId] = useState<string>()
	const { revealSlice, cancelReveal } = useSliceScroll(slices, uiScale)

	const handleMessage = useStableCallback(({ data }: MessageEvent<unknown>) => {
		if (isSliceOverlayMessage(data)) {
			setSelectedSliceId(data.selectedSliceId)
			return
		}

		if (isScrollToSliceMessage(data)) revealSlice(data.sliceId)
		// A comment pin scroll takes priority over a pending slice reveal.
		if (isScrollToPinMessage(data)) cancelReveal()
	})

	useLayoutEffect(() => subscribeToMessages(handleMessage), [subscribeToMessages, handleMessage])

	return { selectedSliceId, revealSlice }
}

function useSliceScroll(slices: Slice[], uiScale: number) {
	const pendingSliceIdRef = useRef<string>()
	const timeoutRef = useRef<number>()
	const cancelReveal = useStableCallback(() => {
		window.clearTimeout(timeoutRef.current)
		pendingSliceIdRef.current = undefined
	})

	const reveal = useStableCallback(() => {
		const slice = slices.find((slice) => slice.sliceId === pendingSliceIdRef.current)
		pendingSliceIdRef.current = undefined
		if (slice) scrollToSlice(slice, uiScale)
	})

	// Opening an editor panel animates the preview size. Reveal once that size settles.
	const schedule = useStableCallback(() => {
		if (!pendingSliceIdRef.current) return

		window.clearTimeout(timeoutRef.current)
		timeoutRef.current = window.setTimeout(reveal, 100)
	})

	useLayoutEffect(schedule, [schedule, uiScale])

	useLayoutEffect(() => {
		const controller = new AbortController()
		window.addEventListener("resize", schedule, { signal: controller.signal })
		for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
			window.addEventListener(event, cancelReveal, { capture: true, signal: controller.signal })
		}

		return () => {
			cancelReveal()
			controller.abort()
		}
	}, [schedule, cancelReveal])

	const revealSlice = useStableCallback((sliceId: string) => {
		pendingSliceIdRef.current = sliceId
		schedule()
	})

	return { revealSlice, cancelReveal }
}
