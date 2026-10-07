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
	const { revealSlice, cancelReveal, cancelStaleReveal } = useSliceScroll(slices, uiScale)

	const handleMessage = useStableCallback(({ data }: MessageEvent<unknown>) => {
		if (isSliceOverlayMessage(data)) {
			setSelectedSliceId(data.selectedSliceId)
			cancelStaleReveal(data.selectedSliceId)
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

	const cancelStaleReveal = useStableCallback((selectedSliceId: string | undefined) => {
		// Keep a preview click's pending scroll when the editor acknowledges that selection.
		if (pendingSliceIdRef.current !== selectedSliceId) cancelReveal()
	})

	const reveal = useStableCallback(() => {
		const slice = slices.find((slice) => slice.sliceId === pendingSliceIdRef.current)
		// The website may still be rendering the requested slice.
		if (!slice?.rect) return

		pendingSliceIdRef.current = undefined
		scrollToSlice(slice, uiScale)
	})

	// Opening an editor panel animates the preview size. Reveal once that size settles.
	const schedule = useStableCallback(() => {
		if (!pendingSliceIdRef.current) return

		window.clearTimeout(timeoutRef.current)
		timeoutRef.current = window.setTimeout(reveal, 100)
	})

	useLayoutEffect(schedule, [schedule, slices, uiScale])

	useLayoutEffect(() => {
		window.addEventListener("resize", schedule)

		return () => {
			cancelReveal()
			window.removeEventListener("resize", schedule)
		}
	}, [schedule, cancelReveal])

	const revealSlice = useStableCallback((sliceId: string) => {
		pendingSliceIdRef.current = sliceId
		schedule()
	})

	return { revealSlice, cancelReveal, cancelStaleReveal }
}
