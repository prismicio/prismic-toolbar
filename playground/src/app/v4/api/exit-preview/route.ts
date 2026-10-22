import { exitPreview } from "@prismicio/next-v4"

export function GET(): Promise<Response> {
	return exitPreview()
}
