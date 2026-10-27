// v5 Share links point to Prismic's public share page, `<repository>/builder/share/<session>?path=`,
// which pings the session for its latest ref and the website's preview route, then redirects there.
import { expect, test, type Website } from "./infra"

test.skip(
	true,
	"Needs Prismic's share page (prismicio/editor#2596) and `previewUrl` in wroom's `ping` deployed, and the toolbar's new link (#170).",
)

async function copyShareLink(website: Website) {
	await website.page.context().grantPermissions(["clipboard-read", "clipboard-write"])
	await website.bar.getByRole("button", { name: "Share" }).click()
	const link = await website.page.evaluate(() => navigator.clipboard.readText())
	expect(link).toMatch(new RegExp(`^${website.repository.url}/builder/share/[^/?]+\\?path=`))
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

	await expect(page.getByRole("heading", { name: "This preview has ended" })).toBeVisible()
	expect(new URL(page.url()).origin).toBe(repository.url)
})
