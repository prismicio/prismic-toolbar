import Link from "next/link"

// Drafts are not found until a preview starts, which then reloads the page.
export default function NotFound() {
	return (
		<>
			<h1>Not found</h1>
			<p>
				This document does not exist or is not published yet. Drafts show once a preview starts.
			</p>
			<Link href="/">Recent documents</Link>
		</>
	)
}
