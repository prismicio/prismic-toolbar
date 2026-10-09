import type { PrismicDocument } from "@prismicio/client"
import Link from "next/link"

import { createClient, documentTitle, getRepository } from "@/lib/prismic"

export default async function Home() {
	const repository = await getRepository()
	const documents = await getRecentDocuments(repository).catch((error: unknown) => String(error))

	return (
		<>
			<h1>{repository}</h1>
			{typeof documents === "string" ? (
				<p>Could not load this repository: {documents}</p>
			) : (
				<>
					<p>The 50 most recently published documents.</p>
					<ul className="documents">
						{documents.map((document) => (
							<li key={document.id}>
								<Link href={`/documents/${document.id}`}>{documentTitle(document)}</Link>{" "}
								<small>{document.type}</small>
							</li>
						))}
					</ul>
				</>
			)}
		</>
	)
}

async function getRecentDocuments(repository: string): Promise<PrismicDocument[]> {
	const client = await createClient(repository)
	const { results } = await client.get({
		pageSize: 50,
		orderings: { field: "document.last_publication_date", direction: "desc" },
	})
	return results
}
