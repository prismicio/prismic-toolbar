import { useEffect, useRef, useState } from "preact/hooks"

import type { MountToolbarOptions } from "../lib/chunks"
import { repositoryOrigin } from "../lib/env"
import type { PreviewSession, PreviewSnapshot } from "../lib/preview-session"
import { CloseIcon } from "./icons"

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
					href={`${repositoryOrigin(repositoryHost)}/`}
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Open the repository in Prismic"
					title="Open the repository in Prismic"
				>
					<span class="spinner" role="img" aria-label="Loading…" />
				</a>
			) : (
				<span class="logo">
					<span class="spinner" role="img" aria-label="Loading…" />
				</span>
			)}
			<div class="details">
				<p class="title" title={title}>
					{title}
				</p>
				<p class="status">{updating ? "Updating…" : "Live preview"}</p>
			</div>
			{!snapshot.authenticated && (
				<a class="powered" href="https://prismic.io" target="_blank" rel="noopener noreferrer">
					Powered by Prismic
				</a>
			)}
			<div class="actions">
				{snapshot.authenticated && <ShareButton session={session} />}
				<button
					class="exit"
					type="button"
					aria-label="Exit preview"
					title="Exit preview"
					onClick={() => void session.exit()}
				>
					<CloseIcon />
				</button>
			</div>
		</section>
	)
}

type ShareState =
	| { kind: "idle" | "loading" | "copied" | "failed" }
	| { kind: "manual"; url: string }

// Loading shows a spinner.
const shareLabels = {
	idle: "Share",
	loading: "",
	copied: "Copied",
	failed: "Failed",
}

function ShareButton({ session }: { session: PreviewSession }) {
	const [state, setState] = useState<ShareState>({ kind: "idle" })
	const input = useRef<HTMLInputElement>(null)
	// Share links by page, so copying a link again needs no spinner.
	const [links] = useState(() => new Map<string, string>())

	useEffect(() => {
		if (state.kind === "manual") input.current?.select()
		if (state.kind !== "copied" && state.kind !== "failed") return
		const timer = setTimeout(() => setState({ kind: "idle" }), 2000)
		return () => clearTimeout(timer)
	}, [state])

	async function share() {
		const pageURL = window.location.href
		const cached = links.get(pageURL)
		if (!cached) setState({ kind: "loading" })
		try {
			const url = cached ?? (await session.share(pageURL))
			links.set(pageURL, url)
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
			{/* Every label takes space, so the button keeps its width when its label changes. */}
			{Object.entries(shareLabels).map(([kind, label]) => (
				<span key={kind} class={kind === state.kind ? `label-${kind}` : `label-${kind} inactive`}>
					{label || <span class="spinner" role="img" aria-label="Getting link…" />}
				</span>
			))}
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
