"use client"

import { useRouter } from "next/navigation"
import Script from "next/script"
import { useEffect } from "react"

/**
 * Mirrors `<PrismicPreview>` from `@prismicio/next`, which always loads the released toolbar, so
 * the playground can load the toolbar under test instead.
 */
export function Preview(props: { repository: string; toolbarSrc: string; isDraftMode: boolean }) {
	const { repository, toolbarSrc, isDraftMode } = props
	const { refresh } = useRouter()

	useEffect(() => {
		const controller = new AbortController()
		const { signal } = controller

		async function start() {
			const response = await fetch("/api/preview", { redirect: "manual", signal })
			if (response.type !== "opaqueredirect") throw new Error("Failed to start the preview.")
			// A soft refresh cannot leave Next.js's not-found boundary, which renders this tag.
			if (document.querySelector('meta[name="robots"][content="noindex"]')) location.reload()
			else refresh()
		}

		function onUpdate(event: Event) {
			event.preventDefault()
			if (isDraftMode) refresh()
			else start().catch(console.error)
		}

		function onEnd(event: Event) {
			event.preventDefault()
			fetch("/api/exit-preview", { signal })
				.then(() => refresh())
				.catch(console.error)
		}

		window.addEventListener("prismicPreviewStart", onUpdate, { signal })
		window.addEventListener("prismicPreviewUpdate", onUpdate, { signal })
		window.addEventListener("prismicPreviewEnd", onEnd, { signal })

		// Share links set the preview cookie without going through `/api/preview`.
		const host = repository.includes(".") ? repository : `${repository}.prismic.io`
		const cookie = decodeURIComponent(
			document.cookie
				.split("; ")
				.find((entry) => entry.startsWith("io.prismic.preview="))
				?.slice("io.prismic.preview=".length) ?? "",
		)
		if (cookie && !isDraftMode && (!cookie.startsWith("{") || cookie.includes(`"${host}"`))) {
			start().catch(console.error)
		}

		return () => controller.abort()
	}, [repository, isDraftMode, refresh])

	return <Script src={toolbarSrc} strategy="lazyOnload" />
}
