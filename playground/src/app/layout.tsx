import type { Metadata } from "next"
import { draftMode } from "next/headers"
import Link from "next/link"
import type { ReactNode } from "react"

import { getRepository, getToolbarSrc } from "@/lib/prismic"

import { Preview } from "./Preview"
import { RepositoryPicker } from "./RepositoryPicker"

import "./globals.css"

export const metadata: Metadata = { title: "Prismic Toolbar playground" }

export default async function RootLayout({ children }: { children: ReactNode }) {
	const repository = await getRepository()
	const toolbarSrc = getToolbarSrc(repository)
	const { isEnabled: isDraftMode } = await draftMode()

	return (
		<html lang="en">
			<body>
				<header className="header">
					<Link href="/">Prismic Toolbar playground</Link>
					<RepositoryPicker repository={repository} />
					<p>
						Preview {isDraftMode ? "on" : "off"} · Toolbar <code>{toolbarSrc}</code>
					</p>
				</header>
				<main>{children}</main>
				<Preview repository={repository} toolbarSrc={toolbarSrc} isDraftMode={isDraftMode} />
			</body>
		</html>
	)
}
