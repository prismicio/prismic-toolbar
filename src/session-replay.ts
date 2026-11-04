import * as sessionReplay from "@amplitude/session-replay-browser"

import type { SessionReplayMessage } from "./embedded-preview/message-protocol"

let revision = 0
let pending = Promise.resolve()

export function setSessionReplay(config: SessionReplayMessage["config"]): Promise<void> {
	const currentRevision = ++revision
	sessionReplay.shutdown()
	// Serialize SDK initialization so a stop or a newer session wins while init is pending.
	pending = pending
		.catch(() => {})
		.then(async () => {
			if (!config || currentRevision !== revision) return
			try {
				await sessionReplay.init(config.apiKey, {
					deviceId: config.deviceId,
					sessionId: config.sessionId,
					serverZone: config.serverZone,
					crossOriginIframes: { enabled: true },
					privacyConfig: config.privacyConfig,
				}).promise
				if (currentRevision !== revision) {
					sessionReplay.shutdown()
					return
				}
			} catch (error) {
				sessionReplay.shutdown()
				throw error
			}
		})
	return pending
}
