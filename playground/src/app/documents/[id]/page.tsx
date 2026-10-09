import { NotFoundError } from "@prismicio/client"
import { SliceZone } from "@prismicio/react"
import { notFound } from "next/navigation"

import { createClient, documentTitle, findSlices } from "@/lib/prismic"

import { Slice } from "../../Slice"

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const client = await createClient()
	const document = await client.getByID(id).catch((error: unknown) => {
		if (error instanceof NotFoundError) notFound()
		throw error
	})
	const slices = findSlices(document)

	return (
		<article>
			<h1>{documentTitle(document)}</h1>
			<p>
				<small>
					{document.type} · {document.uid ?? document.id}
				</small>
			</p>
			{slices ? (
				<SliceZone slices={slices} components={{}} defaultComponent={Slice} />
			) : (
				<p>This document has no slices.</p>
			)}
			<details>
				<summary>Document data</summary>
				<pre>{JSON.stringify(document.data, null, 2)}</pre>
			</details>
		</article>
	)
}
