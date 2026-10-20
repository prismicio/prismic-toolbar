import Link from "next/link"

import { basePath, type Flow } from "@/lib/prismic"

// Drafts are not found until a preview starts, which then reloads the page.
export function NotFound({ flow }: { flow: Flow }) {
	return (
		<>
			<h1>Not found</h1>
			<p>
				This document does not exist or is not published yet. Drafts show once a preview starts.
			</p>
			<Link href={basePath[flow] || "/"}>Recent documents</Link>
		</>
	)
}
