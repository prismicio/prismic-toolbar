import { expect, test } from "./infra"

test.beforeEach(async ({ page }) => {
	// Copy without writing to the system clipboard.
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: async (text: string) => sessionStorage.setItem("clipboard", text) },
		})
	})
})

test("shows the preview's title and status, isolated from the website's styles", async ({
	repository,
	website,
}) => {
	await repository.startPreview("ref-1")
	await website.goto()

	await expect(website.previewBar).toContainText(repository.title)
	await expect(website.previewBar).toContainText("Live preview")
	await expect(website.page.locator("h1.title")).toHaveCSS("color", "rgb(255, 0, 0)")
	await expect(website.previewBar.locator(".title")).not.toHaveCSS("color", "rgb(255, 0, 0)")
	await expect(
		website.previewBar.getByRole("link", { name: "Open the repository in Prismic" }),
	).toHaveAttribute("href", `${repository.url}/`)
})

test("shows that the preview is updating while the page reloads", async ({
	repository,
	website,
}) => {
	await repository.startPreview("ref-1")
	await website.goto()
	await expect(website.previewBar).toContainText("Live preview")
	// Playwright waits for the reload to finish, so the page records its status for later.
	await website.page.evaluate(() => {
		const bar = document.querySelector("#prismic-toolbar")!.shadowRoot!
		new MutationObserver(() => {
			sessionStorage.setItem("status", bar.querySelector(".status")?.textContent ?? "")
		}).observe(bar, { subtree: true, childList: true, characterData: true })
	})

	repository.ref = "ref-2"

	await expect(website.content).toHaveText("Draft content: ref-2", { timeout: 10_000 })
	expect(await website.page.evaluate(() => sessionStorage.getItem("status"))).toBe("Updating…")
})

test("copies a share link to the current page", async ({ repository, website }) => {
	await repository.startPreview("ref-1")
	await website.goto()

	await website.previewBar.getByRole("button", { name: "Copy share link" }).click()

	await expect(website.previewBar.getByRole("button", { name: "Link copied" })).toBeVisible()
	expect(await website.page.evaluate(() => sessionStorage.getItem("clipboard"))).toBe(
		`${repository.url}/previews/s/share-id`,
	)
	expect(repository.shares).toEqual([
		{
			sessionId: repository.sessionID,
			pageURL: `${website.url}/`,
			title: repository.title,
			imageName: `${repository.sessionID}.jpg`,
			_: "csrf-token",
		},
	])
})

test("shows the share link when the browser cannot copy it", async ({ repository, website }) => {
	await repository.startPreview("ref-1")
	await website.goto()
	await expect(website.previewBar).toBeVisible()
	await website.page.evaluate(() => {
		navigator.clipboard.writeText = () => Promise.reject(new Error("Denied"))
	})

	await website.previewBar.getByRole("button", { name: "Copy share link" }).click()

	await expect(website.previewBar.getByRole("textbox", { name: "Share link" })).toHaveValue(
		`${repository.url}/previews/s/share-id`,
	)
})

test("reports when Prismic cannot create a share link", async ({
	repository,
	website,
	context,
}) => {
	await context.route(
		(url) => url.href.startsWith(`${repository.url}/previews/s?`),
		(route) => route.fulfill({ status: 500 }),
	)
	await repository.startPreview("ref-1")
	await website.goto()

	await website.previewBar.getByRole("button", { name: "Copy share link" }).click()

	await expect(
		website.previewBar.getByRole("button", { name: "Could not get a link" }),
	).toBeVisible()
})

test("offers share link visitors no share link", async ({ repository, website }) => {
	await repository.startPreview("ref-1", { authenticated: false })
	await website.goto()

	await expect(website.previewBar.getByRole("link", { name: "Powered by Prismic" })).toBeVisible()
	await expect(website.previewBar.getByRole("button", { name: "Copy share link" })).toHaveCount(0)
	await expect(
		website.previewBar.getByRole("link", { name: "Open the repository in Prismic" }),
	).toHaveCount(0)
	await expect(website.previewBar.getByRole("button", { name: "Exit preview" })).toBeVisible()
})
