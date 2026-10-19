import { loadChunk } from "./chunks"
import { warn } from "./env"
import { createPreviewSession, type PreviewSessionOptions } from "./preview-session"

/** Runs website previews through the repository's iframe, with the JSON preview cookie. */
export function startLegacy({
	repositoryHost,
	assets,
	connect,
}: Pick<PreviewSessionOptions, "repositoryHost" | "connect"> & { assets: string }): void {
	const session = createPreviewSession({
		repositoryHost,
		codec: "json",
		watchCookie: true,
		connect,
	})
	// The preview bar only loads once a preview session is active.
	const unsubscribe = session.subscribe((snapshot) => {
		if (snapshot.status !== "polling") return
		unsubscribe()
		loadChunk(`${assets}/toolbar.js`, "mountToolbar")
			.then((mountToolbar) => mountToolbar({ session, repositoryHost }))
			.catch((error: unknown) => warn(`Could not load the preview toolbar.\n\n${String(error)}`))
	})
	void session.start()
}
