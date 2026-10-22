import { repositoryOrigin } from "./env"

/** Prismic's answer: the session's ref and title, or `close` once the session ended. */
export interface PingResponse {
	ref?: string
	title?: string
	close?: boolean
}

/** Asks Prismic's public `ping` endpoint for a preview session's state. Needs no credentials. */
export async function ping(repositoryHost: string, session: string, ref: string) {
	const url = `${repositoryOrigin(repositoryHost)}/previews/${session}/ping?ref=${encodeURIComponent(ref)}`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Prismic responded ${response.status} to ping.`)
	return (await response.json()) as PingResponse
}
