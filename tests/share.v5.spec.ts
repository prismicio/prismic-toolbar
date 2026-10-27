import { expect, test } from "./infra"

// Needs prismic-toolbar#170, editor#2596, and the wroom change adding `previewUrl` to `ping`.
test.fixme("shares the preview through Prismic's share page", async ({
	repository,
	website,
	visitor,
	startPreview,
}) => {
	const draft = await startPreview()
	await website.page.context().grantPermissions(["clipboard-read", "clipboard-write"])
	await website.bar.getByRole("button", { name: "Share" }).click()
	const link = await website.page.evaluate(() => navigator.clipboard.readText())
	expect(link).toMatch(new RegExp(`^${repository.url}/builder/share/[^/?]+\\?path=`))
	await repository.updateDraft(draft, { payload: "Draft 2" })

	const page = await visitor()
	await page.goto(link)

	// The share page sends the session's latest ref to the website's preview route.
	await expect(page).toHaveURL(website.page.url())
	await expect(page.getByTestId("payload")).toHaveText("Draft 2")
	await repository.publish(draft)
	await (await visitor()).goto(link)
	await expect(page.getByRole("heading", { name: "This preview has ended" })).toBeVisible()
})
