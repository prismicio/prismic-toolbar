import { Prismic } from "./client"
import { readRepositories, saveState, test as teardown } from "./test"

teardown("delete repositories", async ({ request }) => {
	const prismic = await Prismic.signIn()
	for (const domain of readRepositories()) await prismic.deleteRepository(domain)
	await saveState(request, [])
})
