/**
 * The Page Builder's shared preview of a draft, where anyone previewing it reads its comments and
 * signed-in visitors comment. `returnTo` is the page to come back to.
 */
export function commentsURL(args: {
	repositoryOrigin: string
	session: string
	documentId: string
	returnTo: string
}): string {
	const url = new URL(
		`/builder/preview/${encodeURIComponent(args.documentId)}`,
		args.repositoryOrigin,
	)
	url.searchParams.set("session", args.session)
	url.searchParams.set("returnTo", args.returnTo)
	return url.href
}
