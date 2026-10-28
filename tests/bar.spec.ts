import { expect, test } from "./infra/test"

test("shows the preview's title and status, isolated from the website's styles", async ({
	repository,
	website,
	startPreview,
}, { project }) => {
	await startPreview()

	await expect(website.bar).toContainText("Spring launch")
	await expect(website.bar).toContainText("Live preview")
	await expect(website.page.locator("h1.title")).toHaveCSS("color", "rgb(255, 0, 0)")
	await expect(website.bar.locator(".title")).not.toHaveCSS("color", "rgb(255, 0, 0)")
	// Only v4 asks Prismic whether the visitor is signed in.
	const repositoryLink = website.bar.getByRole("link", { name: "Open the repository in Prismic" })
	if (project.name === "v4")
		await expect(repositoryLink).toHaveAttribute("href", `${repository.url}/`)
	else await expect(repositoryLink).toHaveCount(0)
})

test("shows that the preview is updating while the page reloads", async ({
	repository,
	website,
	startPreview,
}) => {
	const draft = await startPreview()
	await expect(website.bar).toContainText("Live preview")
	// Playwright waits for the reload to finish, so the page records the status for later.
	await website.page.evaluate(() => {
		const bar = document.querySelector("#prismic-toolbar")!.shadowRoot!
		new MutationObserver(() => {
			sessionStorage.setItem("status", bar.querySelector(".status")?.textContent ?? "")
		}).observe(bar, { subtree: true, childList: true, characterData: true })
	})

	await repository.updateDraft(draft, { payload: "Draft 2" })

	await expect(website.payload).toHaveText("Draft 2")
	expect(await website.page.evaluate(() => sessionStorage.getItem("status"))).toBe("Updating…")
})
