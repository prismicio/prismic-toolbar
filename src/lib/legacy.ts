import { loadChunk } from "./chunks"
import { warn } from "./env"
import { createPreviewSession, type PreviewSessionOptions } from "./preview-session"

export interface LegacyOptions extends Pick<PreviewSessionOptions, "repositoryHost" | "connect"> {
	/** URL of the folder serving the toolbar's bundles. */
	assets: string
}

/**
 * Runs previews on a website through the repository's iframe: syncs the website's JSON preview
 * cookie with the repository's preview session and shows the preview bar while one is active.
 */
export function startLegacy({ repositoryHost, assets, connect }: LegacyOptions): void {
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
