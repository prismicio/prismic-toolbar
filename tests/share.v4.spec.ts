import { expect, test } from "./infra/test"

test("shares the preview with signed-out visitors", async ({
	context,
	repository,
	website,
	visitor,
	startPreview,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"])
	const draft = await startPreview()

	await website.bar.getByRole("button", { name: "Share" }).click()

	const clipboard = () => website.page.evaluate(() => navigator.clipboard.readText())
	await expect.poll(clipboard).toMatch(/^https:\/\//)
	const link = await clipboard()

	// Someone without a Prismic account opens the link.
	const page = await visitor()
	await page.goto(link)
	await expect(page.getByTestId("payload")).toHaveText("Draft 1")
	expect(page.url()).toBe(website.page.url())
	const bar = website.barOf(page)
	await expect(bar.getByRole("link", { name: "Powered by Prismic" })).toBeVisible()
	await expect(bar.getByRole("button", { name: "Share" })).toHaveCount(0)
	await expect(bar.getByRole("link", { name: "Open the repository in Prismic" })).toHaveCount(0)
	await expect(bar.getByRole("button", { name: "Exit preview" })).toBeVisible()

	// They follow later edits.
	await repository.updateDraft(draft, { payload: "Draft 2" })
	await expect(page.getByTestId("payload")).toHaveText("Draft 2")
})

test("shows the link when the browser cannot copy it", async ({ website, startPreview }) => {
	await startPreview()
	await expect(website.bar).toBeVisible()
	await website.page.evaluate(() => {
		navigator.clipboard.writeText = () => Promise.reject(new Error("Denied"))
	})

	await website.bar.getByRole("button", { name: "Share" }).click()

	await expect(website.bar.getByRole("textbox", { name: "Share link" })).toHaveValue(/^https:\/\//)
})

test("reports when Prismic cannot create a share link", async ({
	context,
	repository,
	website,
	startPreview,
}) => {
	// Breaks Prismic's real response.
	await context.route(`${repository.url}/previews/s?*`, (route) => route.fulfill({ status: 500 }))
	await startPreview()

	await website.bar.getByRole("button", { name: "Share" }).click()

	await expect(website.bar.getByRole("button", { name: "Failed" })).toBeVisible()
})
