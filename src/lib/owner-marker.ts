import Cookies from "js-cookie"

import { deleteCookie, setCookie } from "./cookie"
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
	try {
		const owner = JSON.parse(Cookies.get(ownerCookieName) ?? "null") as Partial<Owner> | null
		if (
			owner?.version === 2 &&
			typeof owner.repository === "string" &&
			owner.repository &&
			typeof owner.ref === "string" &&
			owner.ref &&
			Number.isFinite(owner.at)
		) {
			return owner as Owner
		}
	} catch {
		return undefined
	}
}

/** The editor pushes on every edit, so a marker this old belongs to an editor no longer in use. */
const ownershipTTL = 10 * 60 * 1000

/**
 * The editor owns the preview cookie only while the cookie still holds the ref it pushed, and only
 * for a while after that push. Any other write, such as a share link or an exit, ends the ownership
 * without touching the marker; expiring keeps an old push from hiding a newer preview session.
 */
export function liveOwner(cookie: SiteCookie, now = Date.now()): Owner | undefined {
	const owner = readOwner()
	if (!owner || cookie.kind === "none" || cookie.raw !== owner.ref) return undefined
	if (now - owner.at < ownershipTTL) return owner
}

export function claimOwnership(repository: string, ref: string, at: number): void {
	setCookie(ownerCookieName, JSON.stringify({ version: 2, repository, ref, at } satisfies Owner))
}

export function releaseOwnership(): void {
	deleteCookie(ownerCookieName)
}
