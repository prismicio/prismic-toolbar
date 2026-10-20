import { exitPreview } from "@prismicio/next-legacy"

export function GET(): Promise<Response> {
	return exitPreview()
}
