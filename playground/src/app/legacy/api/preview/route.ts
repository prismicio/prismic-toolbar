import { redirectToPreviewURL } from "@prismicio/next-legacy"
import type { NextRequest } from "next/server"

import { createClient, documentURL, rememberRepository } from "@/lib/prismic"

export async function GET(request: NextRequest): Promise<never> {
	const client = await createClient(await rememberRepository(request))
	const linkResolver = (document: { id: string }) => documentURL("legacy", document.id)
	return redirectToPreviewURL({ client, request, linkResolver })
}
