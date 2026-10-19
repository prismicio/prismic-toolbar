import { expect, test } from "../infra"

// No SDK opts into the modern flow yet: websites with `v=5` run the legacy flow.
test("starts previews through the repository iframe with v=5", async ({ repository, website }) => {
	website.scriptQuery += "&v=5"
	await repository.startPreview("ref-1")
	await website.goto()

	await expect(website.content).toHaveText("Draft content: ref-1")
	await expect(website.previewBar).toBeVisible()
	expect(website.loads).toEqual([null, "ref-1"])
})
