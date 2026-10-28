// Visitors without a Prismic account open a v5 Share link, which Prismic redirects to the website's
// preview route with the session's latest ref.
import { expect, test } from "./infra/test"

test("shares the latest draft with signed-out visitors", async ({
	repository,
	website,
	visitor,
	startPreview,
}) => {
	const draft = await startPreview()
	await website.page.context().grantPermissions(["clipboard-read", "clipboard-write"])
	await website.bar.getByRole("button", { name: "Share" }).click()
	const clipboard = () => website.page.evaluate(() => navigator.clipboard.readText())
	await expect.poll(clipboard).toMatch(/^https:\/\//)
	const link = await clipboard()
	// The link outlives the ref it was created with.
	await repository.updateDraft(draft, { payload: "Draft 2" })

	const page = await visitor()
	await page.goto(link)

	await expect(page).toHaveURL(website.page.url())
	await expect(page.getByTestId("payload")).toHaveText("Draft 2")
	await expect(website.barOf(page)).toBeVisible()
})
