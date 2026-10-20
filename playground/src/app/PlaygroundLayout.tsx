import type { Metadata } from "next"
import { draftMode } from "next/headers"
import Link from "next/link"
import type { ReactNode } from "react"

import { basePath, getRepository, getToolbarSrc, type Flow } from "@/lib/prismic"

import { Preview } from "./Preview"
import { RepositoryPicker } from "./RepositoryPicker"

import "./globals.css"

export const metadata: Metadata = { title: "Prismic Toolbar playground" }

export async function PlaygroundLayout({ flow, children }: { flow: Flow; children: ReactNode }) {
	const repository = await getRepository()
	const toolbarSrc = getToolbarSrc(repository, flow)
	const { isEnabled: isDraftMode } = await draftMode()
	const home = basePath[flow] || "/"
	const otherFlow = flow === "modern" ? "legacy" : "modern"

	return (
		<html lang="en">
			<body>
				<header className="header">
					<Link href={home}>Prismic Toolbar playground</Link>
					<RepositoryPicker repository={repository} home={home} />
					<p>
						{/* Each flow has its own root layout: switching reloads the page and the toolbar. */}
						Flow: {flow} · <a href={basePath[otherFlow] || "/"}>Switch to {otherFlow}</a>
					</p>
					<p>
						Preview {isDraftMode ? "on" : "off"} · Toolbar <code>{toolbarSrc}</code>
					</p>
				</header>
				<main>{children}</main>
				<Preview
					basePath={basePath[flow]}
					repository={repository}
					toolbarSrc={toolbarSrc}
					isDraftMode={isDraftMode}
				/>
			</body>
		</html>
	)
}
