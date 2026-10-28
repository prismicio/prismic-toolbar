// v5 Share links point to Prismic, `<repository>/previews/share/<session>?path=`, which redirects to
// the website's preview route with the session's latest ref.
import { expect, test, type Website } from "./infra"

async function copyShareLink(website: Website) {
	await website.page.context().grantPermissions(["clipboard-read", "clipboard-write"])
	await website.bar.getByRole("button", { name: "Share" }).click()
	await expect(website.bar.getByRole("button", { name: "Copied" })).toBeVisible()
	const link = await website.page.evaluate(() => navigator.clipboard.readText())
	expect(link).toMatch(new RegExp(`^${website.repository.url}/previews/share/[^/?]+\\?path=`))
	return link
}

test("shares the latest draft with signed-out visitors", async ({
	repository,
	website,
	visitor,
	startPreview,
}) => {
	const draft = await startPreview()
	const link = await copyShareLink(website)
	// The link outlives the ref it was created with.
	await repository.updateDraft(draft, { payload: "Draft 2" })

	const page = await visitor()
	await page.goto(link)

	await expect(page).toHaveURL(website.page.url())
	await expect(page.getByTestId("payload")).toHaveText("Draft 2")
	await expect(website.barOf(page)).toBeVisible()
})

test("shows that the preview ended once the session closed", async ({
	repository,
	website,
	visitor,
	startPreview,
}) => {
	const draft = await startPreview()
	const link = await copyShareLink(website)
	await repository.publish(draft)

	const page = await visitor()
	await page.goto(link)

	await expect(page.getByText("This preview link has expired")).toBeVisible()
	expect(new URL(page.url()).origin).toBe(repository.url)
})
