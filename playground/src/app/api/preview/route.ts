import { redirectToPreviewURL } from "@prismicio/next"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

import { createClient, isRepository, linkResolver, repositoryCookie } from "@/lib/prismic"

export async function GET(request: NextRequest): Promise<never> {
	// Previews started from Prismic carry the repository in their token. Remember it, so the editor
	// can preview any repository whose preview settings point here.
	const repository = repositoryFromToken(request.nextUrl.searchParams.get("token"))
	if (repository) {
		;(await cookies()).set(repositoryCookie, repository, {
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
			// The editor previews the playground in a cross-site iframe.
			sameSite: "none",
			secure: true,
		})
	}

	return redirectToPreviewURL({ client: await createClient(repository), request, linkResolver })
}

// Tokens look like `https://example.prismic.io/previews/…` or `https://example.wroom.io/previews/…`.
function repositoryFromToken(token: string | null): string | undefined {
	if (!URL.canParse(token ?? "")) return undefined

	const host = new URL(token as string).hostname.replace(".cdn.", ".")
	const repository = host.endsWith(".prismic.io") ? host.split(".")[0] : host
	return repository && isRepository(repository) ? repository : undefined
}
