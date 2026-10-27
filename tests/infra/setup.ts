import { execSync } from "node:child_process"

import { websites } from "../../playwright.config"
import { Prismic, signIn } from "./client"
import { saveState, test as setup } from "./test"

setup("build the toolbar", () => {
	execSync("npm run build", { stdio: "inherit" })
})

setup("create repositories", async ({ request }, testInfo) => {
	setup.setTimeout(5 * 60_000)
	// Tests start previews from this session, like the editor.
	await signIn(request)
	const prismic = await Prismic.signIn()
	await prismic.deleteStaleRepositories()

	// Publishing changes the ref of every preview in a repository, so each worker gets its own, and a
	// second one to preview on the same website.
	const repositories = await Promise.all(
		Array.from({ length: testInfo.config.workers * 2 }, () => prismic.createRepository()),
	)
	// Saved before anything else can fail, so teardown deletes them.
	await saveState(request, repositories)

	const urls = Object.values(websites).map((port) => `http://localhost:${port}`)
	await Promise.all(repositories.map((repository) => repository.setUp(urls)))
})
