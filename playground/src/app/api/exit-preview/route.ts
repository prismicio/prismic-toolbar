import { exitPreview } from "@prismicio/next"
import { cookies } from "next/headers"

import { sessionCookie } from "@/lib/prismic"

export async function GET(): Promise<Response> {
	;(await cookies()).delete({ name: sessionCookie, sameSite: "none", secure: true })
	return exitPreview()
}
