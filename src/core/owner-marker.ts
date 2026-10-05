import { deleteCookie, getCookie, setCookie } from "./cookie"
import type { SiteCookie } from "./site-cookie"

/**
 * Written by the toolbar inside the editor just before it stores an editor-pushed ref. Website tabs
 * share the cookie jar with the editor's preview, so they read it to leave that ref alone. Cookies
 * are the only storage both contexts share: the editor's iframe gets partitioned local storage.
 */
export const ownerCookieName = "io.prismic.preview.updated"

export interface Owner {
	version: 2
	/** Host of the repository whose editor pushed the ref. */
	repository: string
	ref: string
	/** `Date.now()` when the editor pushed the ref. */
	at: number
}

export function readOwner(): Owner | undefined {
	const raw = getCookie(ownerCookieName)
	if (!raw) return undefined

	try {
		const value = JSON.parse(raw) as Partial<Owner> | null
		if (
			value?.version === 2 &&
			typeof value.repository === "string" &&
			value.repository.length > 0 &&
			typeof value.ref === "string" &&
			value.ref.length > 0 &&
			typeof value.at === "number" &&
			Number.isFinite(value.at)
		) {
			return value as Owner
		}
	} catch {
		// Malformed markers claim nothing.
	}
}

/**
 * The editor owns the preview cookie only while the cookie still holds the ref it pushed. Any other
 * write, such as a share link or an exit, ends the ownership without touching the marker.
 */
export function liveOwner(cookie: SiteCookie): Owner | undefined {
	const owner = readOwner()
	if (owner && cookie.kind !== "none" && cookie.raw === owner.ref) return owner
}

export function claimOwnership(repository: string, ref: string, at: number): void {
	const owner: Owner = { version: 2, repository, ref, at }
	setCookie(ownerCookieName, JSON.stringify(owner))
}

export function releaseOwnership(): void {
	deleteCookie(ownerCookieName)
}
