import { useEffect, useRef, useState } from "preact/hooks"

import type { MountToolbarOptions } from "../../core/chunks"
import type { PreviewSession, PreviewSnapshot } from "../../core/preview-session"
import { CloseIcon, PrismicLogo } from "./icons"

export function PreviewBar({ session, repositoryHost }: MountToolbarOptions) {
	const snapshot = useSnapshot(session)
	if (!snapshot.preview) return null

	const title = snapshot.preview.title || "Preview"
	const updating = snapshot.status === "reloading"

	return (
		<section class="bar" aria-label="Prismic preview">
			{snapshot.authenticated ? (
				<a
					class="logo"
					href={`https://${repositoryHost}/`}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Open the repository in Prismic"
					title="Open the repository in Prismic"
				>
					<PrismicLogo />
				</a>
			) : (
				<span class="logo">
					<PrismicLogo />
				</span>
			)}
			<div class="details">
				<p class="title" title={title}>
					{title}
				</p>
				<p class="status">
					<span class={updating ? "dot" : "dot live"} aria-hidden="true" />
					{updating ? "Updating…" : "Live preview"}
				</p>
			</div>
			{snapshot.authenticated ? (
				<ShareButton session={session} />
			) : (
				<a class="powered" href="https://prismic.io" target="_blank" rel="noopener noreferrer">
					Powered by Prismic
				</a>
			)}
			<button
				class="exit"
				type="button"
				aria-label="Exit preview"
				title="Exit preview"
				onClick={() => void session.exit()}
			>
				<CloseIcon />
			</button>
		</section>
	)
}

type ShareState =
	| { kind: "idle" | "loading" | "copied" | "failed" }
	| { kind: "manual"; url: string }

const shareLabels = {
	idle: "Copy share link",
	loading: "Getting link…",
	copied: "Link copied",
	failed: "Could not get a link",
}

function ShareButton({ session }: { session: PreviewSession }) {
	const [state, setState] = useState<ShareState>({ kind: "idle" })
	const input = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (state.kind === "manual") input.current?.select()
		if (state.kind !== "copied" && state.kind !== "failed") return
		const timer = setTimeout(() => setState({ kind: "idle" }), 2000)
		return () => clearTimeout(timer)
	}, [state])

	async function share() {
		setState({ kind: "loading" })
		try {
			const url = await session.share()
			// Copying can fail once the click is too old; show the link to copy by hand instead.
			setState((await copyText(url)) ? { kind: "copied" } : { kind: "manual", url })
		} catch {
			setState({ kind: "failed" })
		}
	}

	if (state.kind === "manual") {
		return (
			<input
				ref={input}
				class="share-url"
				type="text"
				readOnly
				value={state.url}
				aria-label="Share link"
				onFocus={(event) => event.currentTarget.select()}
			/>
		)
	}

	return (
		<button
			class="share"
			type="button"
			disabled={state.kind === "loading"}
			aria-live="polite"
			onClick={() => void share()}
		>
			{shareLabels[state.kind]}
		</button>
	)
}

function useSnapshot(session: PreviewSession): PreviewSnapshot {
	const [snapshot, setSnapshot] = useState(session.getSnapshot)

	useEffect(() => {
		setSnapshot(session.getSnapshot())
		return session.subscribe(setSnapshot)
	}, [session])

	return snapshot
}

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}
