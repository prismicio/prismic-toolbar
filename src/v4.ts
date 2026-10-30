import { registerChunk } from "./lib/chunks"
import { createPreviewSession } from "./lib/preview-session"
import { mountToolbar } from "./lib/toolbar"

/** Runs website previews through the repository's shell and `ping`, with the JSON preview cookie. */
export function startV4(repositoryHost: string): void {
	const session = createPreviewSession({ repositoryHost, codec: "json", watchCookie: true })
	// Most visitors never preview: only mount the bar once a preview session is active.
	const unsubscribe = session.subscribe((snapshot) => {
		if (snapshot.status !== "polling") return
		unsubscribe()
		mountToolbar(session, repositoryHost)
	})
	void session.start()
}

registerChunk("v4", startV4)
