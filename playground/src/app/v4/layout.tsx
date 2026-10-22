import type { ReactNode } from "react"

import { PlaygroundLayout } from "../PlaygroundLayout"

export { metadata } from "../PlaygroundLayout"

export default function RootLayout({ children }: { children: ReactNode }) {
	return <PlaygroundLayout flow="v4">{children}</PlaygroundLayout>
}
