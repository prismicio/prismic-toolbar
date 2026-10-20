import * as prismic from "@prismicio/client"
import { enableAutoPreviews } from "@prismicio/next"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"

/**
 * Each toolbar flow runs with the `@prismicio/next` that supports it: modern (`v=5`) at `/`, and
 * legacy at `/legacy`.
 */
export type Flow = "modern" | "legacy"

export const basePath = { modern: "", legacy: "/legacy" } satisfies Record<Flow, string>

/** Remembers the repository picked in the playground. */
export const repositoryCookie = "playground-repository"

const defaultRepository = process.env.NEXT_PUBLIC_DEFAULT_REPOSITORY || "prismic-main"

/** A repository name (`example`) or, outside `prismic.io`, its host (`example.wroom.io`). */
export function isRepository(value: string): boolean {
	return /^[a-z0-9][-a-z0-9]*(\.[-a-z0-9]+)*$/i.test(value)
}

export async function getRepository(): Promise<string> {
	const repository = (await cookies()).get(repositoryCookie)?.value
	return repository && isRepository(repository) ? repository : defaultRepository
}

export async function createClient(repository?: string): Promise<prismic.Client> {
	const client = prismic.createClient(endpoint(repository ?? (await getRepository())), {
		fetchOptions: { cache: "no-store" },
	})
	enableAutoPreviews({ client })
	return client
}

// The Content API of a repository outside `prismic.io` lives on the matching `cdn` host.
function endpoint(repository: string) {
	if (!repository.includes(".")) return prismic.getRepositoryEndpoint(repository)

	const [name, ...domain] = repository.split(".")
	return `https://${name}.cdn.${domain.join(".")}/api/v2`
}

/**
 * The toolbar to test: `TOOLBAR_SRC` when set, as `npm run dev` does, the pull request's build on
 * pull request deployments, or the released toolbar. The modern flow opts into `v=5`.
 */
export function getToolbarSrc(repository: string, flow: Flow): string {
	const pullRequest = process.env.VERCEL_GIT_PULL_REQUEST_ID
	const src =
		process.env.TOOLBAR_SRC ||
		(pullRequest
			? `https://prismic.io/prismic-toolbar/pr-${pullRequest}/prismic.js`
			: "https://static.cdn.prismic.io/prismic.js")

	return `${src}?repo=${encodeURIComponent(repository)}${flow === "modern" ? "&v=5" : ""}`
}

export function documentURL(flow: Flow, id: string): string {
	return `${basePath[flow]}/documents/${id}`
}

/**
 * Previews started from Prismic carry the repository in their token. Remembers it, so the editor
 * can preview any repository whose preview settings point here.
 */
export async function rememberRepository(request: NextRequest): Promise<string | undefined> {
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
	return repository
}

// Tokens look like `https://example.prismic.io/previews/…` or `https://example.wroom.io/previews/…`.
function repositoryFromToken(token: string | null): string | undefined {
	if (!URL.canParse(token ?? "")) return undefined

	const host = new URL(token as string).hostname.replace(".cdn.", ".")
	const repository = host.endsWith(".prismic.io") ? host.split(".")[0] : host
	return repository && isRepository(repository) ? repository : undefined
}

export function documentTitle(document: prismic.PrismicDocument): string {
	const { title } = document.data
	if (typeof title === "string" && title) return title
	if (prismic.isFilled.richText(title as prismic.RichTextField)) {
		return prismic.asText(title as prismic.RichTextField)
	}
	return document.uid ?? document.id
}

/** The document's slice zone, whatever its field is called. */
export function findSlices(document: prismic.PrismicDocument): prismic.Slice[] | undefined {
	return Object.values(document.data).find(
		(value): value is prismic.Slice[] =>
			Array.isArray(value) && value.length > 0 && value.every((item) => "slice_type" in item),
	)
}
