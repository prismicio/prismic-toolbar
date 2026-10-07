import { comments, type Editor, expect, test } from "../infra"

test.beforeEach(async ({ editor }) => {
	await editor.goto({ comments })
	await expect(editor.preview.locator('[data-thread-id="first"]')).toBeVisible()
})

const sliceSelections = (editor: Editor) => editor.messages("select-slice")

const selected = (sliceId: string) => ({ type: "prismic:embedded-preview:select-slice", sliceId })

const setSlices = (
	editor: Editor,
	slices: { sliceId: string; label: string; variation?: string }[],
) => editor.send({ type: "prismic:embedded-preview:set-slices", slices })

test("highlights and selects slices, following the overlay's scale and scroll", async ({
	editor,
}) => {
	const highlight = editor.overlay.locator(".slice-highlight")
	const slice = editor.preview.locator("#first-slice")

	await slice.hover({ position: { x: 400, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
	await expect(highlight).toHaveCSS("border-color", "rgb(110, 86, 207)")
	await expect(highlight).toHaveCSS("border-width", "2px")
	await expect(highlight).toHaveCSS("border-radius", "8px")

	await slice.click()
	await expect.poll(() => sliceSelections(editor)).toEqual([selected("first-slice")])

	await editor.send({ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 })
	await expect(highlight).toHaveCSS("border-width", "4px")
	await expect(highlight).toHaveCSS("border-radius", "16px")
	const box = await highlight.boundingBox()
	expect(box).toEqual(await slice.boundingBox())

	await slice.evaluate(() => window.scrollBy(0, 50))
	await expect.poll(async () => (await highlight.boundingBox())?.y).toBe((box?.y ?? 0) - 50)

	await editor.preview.locator("#outside-slices").hover()
	await expect(highlight).toHaveCount(0)
	await editor.preview.locator("#second-slice").hover()
	await expect(highlight).toHaveAttribute("data-slice-id", "second-slice")
})

test("highlight refreshes position-only changes on pointer movement", async ({ editor, page }) => {
	const slice = editor.preview.locator("#first-slice")
	const highlight = editor.preview.locator(".slice-highlight")
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")

	const box = (await slice.boundingBox())!
	await slice.evaluate((element) => (element.style.transform = "translateY(40px)"))
	await page.mouse.move(box.x + 501, box.y + 200)
	await expect.poll(() => highlight.boundingBox()).toEqual(await slice.boundingBox())

	// Position-only motion is picked up on the next pointer event.
	await slice.evaluate((element) => (element.style.transform = "translateY(500px)"))
	await page.mouse.move(box.x + 502, box.y + 200)
	await expect(highlight).toHaveCount(0)
	await slice.evaluate((element) => (element.style.transform = ""))
	await page.mouse.move(box.x + 503, box.y + 200)
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
	await expect.poll(() => highlight.boundingBox()).toEqual(await slice.boundingBox())
})

test("highlight follows a slice inside a scrolling container", async ({ editor }) => {
	await setSlices(editor, [{ sliceId: "scrolling-slice", label: "Scrolling slice" }])
	await editor.preview.locator("body").evaluate((body) => {
		const scroller = document.createElement("div")
		scroller.id = "scroller"
		scroller.style.cssText =
			"position:absolute;top:50px;left:350px;width:400px;height:300px;overflow:auto"
		scroller.innerHTML = `
			<!--prismic-slice-start:scrolling-slice-->
			<section id="scrolling-slice" style="height:500px;background:lightgreen"></section>
			<!--prismic-slice-end:scrolling-slice-->
			<div style="height:300px"></div>
		`
		body.append(scroller)
	})
	const slice = editor.preview.locator("#scrolling-slice")
	const highlight = editor.preview.locator(".slice-highlight")
	await slice.hover({ position: { x: 100, y: 150 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "scrolling-slice")
	await editor.preview.locator("#scroller").evaluate((element) => (element.scrollTop = 50))
	await expect.poll(() => highlight.boundingBox()).toEqual(await slice.boundingBox())
})

test("highlight and selection use updated roots and marker IDs", async ({ editor }) => {
	const highlight = editor.preview.locator(".slice-highlight")
	await editor.preview.locator("#first-slice").hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
	await editor.preview.locator("#first-slice").evaluate((element) => {
		const replacement = element.cloneNode(true) as HTMLElement
		replacement.style.height = "450px"
		element.replaceWith(replacement)
	})
	await expect
		.poll(() => highlight.boundingBox())
		.toEqual(await editor.preview.locator("#first-slice").boundingBox())

	await editor.preview.locator("body").evaluate((body) => {
		const walker = document.createTreeWalker(body, NodeFilter.SHOW_COMMENT)
		while (walker.nextNode()) {
			const comment = walker.currentNode as Comment
			comment.data = comment.data.replace("first-slice", "renamed-slice")
		}
	})
	// The editor has not described the renamed slice yet.
	await expect(highlight).toHaveCount(0)
	await setSlices(editor, [
		{ sliceId: "renamed-slice", label: "Hero", variation: "Default" },
		{ sliceId: "second-slice", label: "Call to action", variation: "Centered" },
	])
	await expect(highlight).toHaveAttribute("data-slice-id", "renamed-slice")
	await editor.preview.locator("#first-slice").click({ position: { x: 500, y: 200 } })
	await expect
		.poll(async () => (await sliceSelections(editor)).at(-1))
		.toEqual(selected("renamed-slice"))

	await editor.preview.locator("#first-slice").evaluate((element) => element.remove())
	await expect(highlight).toHaveAttribute("data-slice-id", "second-slice")
})

test("highlight does not poll while idle and clears outside the preview", async ({
	editor,
	page,
}) => {
	const slice = editor.preview.locator("#first-slice")
	const highlight = editor.preview.locator(".slice-highlight")
	type Measured = HTMLElement & { measurements: number }
	await slice.evaluate((element: Measured) => {
		const measure = element.getBoundingClientRect.bind(element)
		element.measurements = 0
		element.getBoundingClientRect = () => {
			element.measurements++
			return measure()
		}
	})
	const countMeasurements = () =>
		slice.evaluate(async (element: Measured) => {
			// Let any initial ResizeObserver delivery settle before checking for polling.
			await new Promise(requestAnimationFrame)
			const before = element.measurements
			for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame)
			return element.measurements - before
		})

	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toBeVisible()
	expect(await countMeasurements()).toBe(0)

	await page.mouse.move(20, 850)
	await expect(highlight).toHaveCount(0)
	expect(await countMeasurements()).toBe(0)

	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
})

test("comment placement takes precedence over slice hover and selection", async ({ editor }) => {
	const highlight = editor.preview.locator(".slice-highlight")
	await editor.updateComments({ placementEnabled: true })
	const placement = editor.preview.getByRole("button", { name: "Place a comment here" })

	await placement.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveCount(0)
	await placement.click({ position: { x: 500, y: 200 } })

	await expect.poll(() => editor.messages("place-comment")).toHaveLength(1)
	expect(await sliceSelections(editor)).toEqual([])
})

test("hovering and clicking a comment pin clears slice hover without selecting a slice", async ({
	editor,
}) => {
	const slice = editor.preview.locator("#first-slice")
	const highlight = editor.preview.locator(".slice-highlight")
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toBeVisible()

	const pin = editor.preview.locator('[data-thread-id="first"]')
	await pin.hover()
	await expect(highlight).toHaveCount(0)
	await pin.click()
	expect(await sliceSelections(editor)).toEqual([])

	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
})

test("text can be selected by dragging without selecting the slice", async ({ editor, page }) => {
	await editor.preview.locator("#first-slice").evaluate((element) => {
		const text = document.createElement("span")
		text.id = "selectable-text"
		text.textContent = "Select this page text by dragging across it."
		text.style.cssText =
			"position:absolute;top:100px;left:350px;font:24px monospace;user-select:text"
		element.append(text)
	})
	const text = editor.preview.locator("#selectable-text")
	const box = (await text.boundingBox())!

	await page.mouse.move(box.x + 1, box.y + box.height / 2)
	await page.mouse.down()
	await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 15 })
	await page.mouse.up()

	expect(await text.evaluate(() => window.getSelection()?.toString())).toContain(
		"Select this page text",
	)
	expect(await sliceSelections(editor)).toEqual([])
	await editor.preview.locator("#first-slice").click({ position: { x: 600, y: 250 } })
	await expect.poll(() => sliceSelections(editor)).toEqual([selected("first-slice")])
})

test("native controls remain usable without selecting the slice", async ({ editor, page }) => {
	const slice = editor.preview.locator("#first-slice")
	await slice.evaluate((element) => {
		element.innerHTML = `
			<input id="checkbox" type="checkbox" />
			<label for="checkbox"><span>Toggle checkbox</span></label>
			<details><summary><span>Expand content</span></summary><p>Hidden content</p></details>
			<form>
				<button type="submit"><span>Submit form</span></button>
				<select aria-label="Option"><option>First</option><option>Second</option></select>
				<textarea aria-label="Notes"></textarea>
			</form>
			<div contenteditable="true"><span>Editable content</span></div>
		`
		element.querySelector("form")?.addEventListener("submit", (event) => {
			event.preventDefault()
			element.dataset.submitted = "true"
		})
	})
	const site = editor.preview

	const checkbox = site.getByRole("checkbox")
	await checkbox.click()
	await expect(checkbox).toBeChecked()
	await site.getByText("Toggle checkbox", { exact: true }).click()
	await expect(checkbox).not.toBeChecked()
	await site.getByText("Expand content", { exact: true }).click()
	await expect(site.getByText("Hidden content", { exact: true })).toBeVisible()
	await site.getByText("Submit form", { exact: true }).click()
	await expect(slice).toHaveAttribute("data-submitted", "true")
	await site.getByRole("combobox").click()
	await page.keyboard.press("Escape")
	await site.getByRole("combobox").selectOption({ label: "Second" })
	await expect(site.getByRole("combobox")).toHaveValue("Second")
	await site.getByRole("textbox", { name: "Notes" }).click()
	await page.keyboard.type("Some notes")
	await expect(site.getByRole("textbox", { name: "Notes" })).toHaveValue("Some notes")
	await site.getByText("Editable content", { exact: true }).click()
	await page.keyboard.press("End")
	await page.keyboard.type("!")
	await expect(site.locator('[contenteditable="true"]')).toContainText("!")
	expect(await sliceSelections(editor)).toEqual([])

	await slice.click({ position: { x: 600, y: 350 } })
	await expect.poll(() => sliceSelections(editor)).toEqual([selected("first-slice")])
})

test("links and button roles keep their actions without selecting the slice", async ({
	editor,
}) => {
	const slice = editor.preview.locator("#first-slice")
	await slice.evaluate((element) => {
		element.innerHTML = `
			<a href="#first-slice"><span>Go to slice</span></a>
			<div role="button" tabindex="0"><span>Custom button</span></div>
			<div role="link" tabindex="0"><span>Custom link</span></div>
		`
		for (const control of element.querySelectorAll<HTMLElement>("[role]")) {
			control.addEventListener("click", () => (control.dataset.clicked = "true"))
		}
	})
	const site = editor.preview

	await site.getByText("Go to slice", { exact: true }).click()
	await expect.poll(() => slice.evaluate(() => location.hash)).toBe("#first-slice")
	await site.getByText("Custom button", { exact: true }).click()
	await expect(site.getByRole("button", { name: "Custom button" })).toHaveAttribute(
		"data-clicked",
		"true",
	)
	await site.getByText("Custom link", { exact: true }).click()
	await expect(site.getByRole("link", { name: "Custom link" })).toHaveAttribute(
		"data-clicked",
		"true",
	)
	expect(await sliceSelections(editor)).toEqual([])

	await slice.click({ position: { x: 600, y: 350 } })
	await expect.poll(() => sliceSelections(editor)).toEqual([selected("first-slice")])
})

test("slice roots are selectable but gaps and covering popups are not", async ({ editor }) => {
	await setSlices(editor, [{ sliceId: "split", label: "Split" }])
	const site = editor.preview
	await site.locator("body").evaluate((body) => {
		const container = document.createElement("div")
		container.id = "split-slice"
		container.style.cssText =
			"position:absolute;top:50px;left:350px;width:400px;display:flex;flex-direction:column;gap:50px"
		container.innerHTML = `
			<!--prismic-slice-start:split-->
			<div style="height:50px;background:green"></div>
			<div style="height:50px;background:green"></div>
			<!--prismic-slice-end:split-->
		`
		body.append(container)
	})

	await site.locator("#split-slice").hover({ position: { x: 100, y: 25 } })
	await expect(site.locator(".slice-highlight")).toHaveAttribute("data-slice-id", "split")
	await site.locator("#split-slice").click({ position: { x: 100, y: 25 } })
	await expect.poll(() => sliceSelections(editor)).toEqual([selected("split")])

	await site.locator("#split-slice").hover({ position: { x: 100, y: 75 } })
	await expect(site.locator(".slice-highlight")).toHaveCount(0)
	await site.locator("#split-slice").click({ position: { x: 100, y: 75 } })
	expect(await sliceSelections(editor)).toHaveLength(1)

	await site.locator("body").evaluate((body) => {
		const modal = document.createElement("div")
		modal.id = "modal"
		modal.style.cssText = "position:fixed;inset:0;background:white;z-index:10"
		body.append(modal)
	})
	await site.locator("#modal").click({ position: { x: 450, y: 125 } })
	await expect(site.locator(".slice-highlight")).toHaveCount(0)
	expect(await sliceSelections(editor)).toHaveLength(1)
})

test("hover and click agree for nested gaps and overflowing content", async ({ editor }) => {
	await setSlices(editor, [
		{ sliceId: "outer", label: "Outer" },
		{ sliceId: "inner", label: "Inner" },
	])
	const site = editor.preview
	await site.locator("body").evaluate((body) => {
		const container = document.createElement("div")
		container.innerHTML = `
			<!--prismic-slice-start:outer-->
			<section id="nested-outer" style="position:absolute;top:50px;left:350px;width:400px;height:250px;background:lightblue">
				<!--prismic-slice-start:inner-->
				<div style="height:50px;background:green"></div>
				<div style="height:50px;margin-top:50px;background:green"></div>
				<!--prismic-slice-end:inner-->
				<div id="overflow" style="position:absolute;top:0;left:420px;width:50px;height:50px;background:red"></div>
			</section>
			<!--prismic-slice-end:outer-->
		`
		body.append(container)
	})
	const outer = site.locator("#nested-outer")
	const highlight = site.locator(".slice-highlight")

	for (const [y, sliceId] of [
		[25, "inner"],
		[75, "outer"],
		[200, "outer"],
	] as const) {
		await outer.hover({ position: { x: 100, y } })
		await expect(highlight).toHaveAttribute("data-slice-id", sliceId)
		await outer.click({ position: { x: 100, y } })
		await expect.poll(async () => (await sliceSelections(editor)).at(-1)?.sliceId).toBe(sliceId)
	}
	await site.locator("#overflow").hover()
	await expect(highlight).toHaveAttribute("data-slice-id", "outer")
	await site.locator("#overflow").click()
	await expect
		.poll(async () => (await sliceSelections(editor)).map(({ sliceId }) => sliceId))
		.toEqual(["inner", "outer", "outer", "outer"])
})

test("same-size DOM replacement remains highlightable and selectable", async ({ editor }) => {
	const slice = editor.preview.locator("#first-slice")
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(editor.preview.locator(".slice-highlight")).toHaveAttribute(
		"data-slice-id",
		"first-slice",
	)

	await slice.evaluate((element) => element.replaceWith(element.cloneNode(true)))

	await slice.hover({ position: { x: 501, y: 200 } })
	await expect(editor.preview.locator(".slice-highlight")).toHaveAttribute(
		"data-slice-id",
		"first-slice",
	)
	await slice.click({ position: { x: 501, y: 200 } })
	await expect.poll(() => sliceSelections(editor)).toEqual([selected("first-slice")])
})

test("labels the highlight with the slice's name and variation, inset and scaled", async ({
	editor,
}) => {
	const highlight = editor.preview.locator(".slice-highlight")
	const label = editor.preview.locator(".slice-highlight-label")
	await editor.preview.locator("#first-slice").hover({ position: { x: 500, y: 200 } })
	await expect(label).toHaveText("Hero • Default")
	await expect(label).toBeInViewport()

	const second = editor.preview.locator("#second-slice")
	await second.hover({ position: { x: 500, y: 100 } })
	await expect(label).toHaveText("Call to action • Centered")
	const box = (await highlight.boundingBox())!
	const labelBox = (await label.boundingBox())!
	// Inside the 2px border, 4px from the highlight's corner.
	expect(labelBox.x).toBe(box.x + 6)
	expect(labelBox.y).toBe(box.y + 6)
	expect(labelBox.height).toBe(24)

	await second.evaluate(() => window.scrollBy(0, 40))
	await expect.poll(async () => (await label.boundingBox())?.y).toBe(labelBox.y - 40)

	await editor.send({ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 2 })
	await second.hover({ position: { x: 500, y: 100 } })
	await expect.poll(async () => (await label.boundingBox())?.height).toBe(labelBox.height * 2)
})

test("labels slices without a variation with their name only", async ({ editor }) => {
	await setSlices(editor, [{ sliceId: "first-slice", label: "Hero" }])
	await editor.preview.locator("#first-slice").hover({ position: { x: 500, y: 200 } })
	await expect(editor.preview.locator(".slice-highlight-label")).toHaveText("Hero")
})

test("follows the editor's slices, leaving other documents' slices alone", async ({ editor }) => {
	const first = editor.preview.locator("#first-slice")
	const second = editor.preview.locator("#second-slice")
	const highlight = editor.preview.locator(".slice-highlight")
	const label = editor.preview.locator(".slice-highlight-label")
	await first.hover({ position: { x: 500, y: 200 } })
	await expect(label).toHaveText("Hero • Default")

	await setSlices(editor, [{ sliceId: "first-slice", label: "Banner", variation: "Wide" }])
	await expect(label).toHaveText("Banner • Wide")
	await second.hover({ position: { x: 500, y: 100 } })
	await expect(highlight).toHaveCount(0)
	await second.click({ position: { x: 500, y: 100 } })
	expect(await sliceSelections(editor)).toEqual([])

	await first.hover({ position: { x: 500, y: 200 } })
	await setSlices(editor, [])
	await expect(highlight).toHaveCount(0)
	await first.click({ position: { x: 500, y: 200 } })
	expect(await sliceSelections(editor)).toEqual([])

	// The previous document's DOM can remain while the next one loads.
	await setSlices(editor, [{ sliceId: "second-slice", label: "Footer" }])
	await first.hover({ position: { x: 501, y: 200 } })
	await expect(highlight).toHaveCount(0)
	await second.hover({ position: { x: 500, y: 100 } })
	await expect(label).toHaveText("Footer")
	await second.click({ position: { x: 500, y: 100 } })
	await expect.poll(() => sliceSelections(editor)).toEqual([selected("second-slice")])
})

test("highlights a newly rendered slice once the editor describes it", async ({ editor }) => {
	await editor.preview.locator("body").evaluate((body) => {
		const root = document.createElement("div")
		root.innerHTML = `
			<!--prismic-slice-start:added-->
			<section id="added" style="position:absolute;top:100px;left:400px;width:300px;height:200px;background:white">Added slice</section>
			<!--prismic-slice-end:added-->
		`
		body.append(root)
	})
	const added = editor.preview.locator("#added")
	await added.hover()
	await expect(editor.preview.locator(".slice-highlight")).toHaveCount(0)

	await setSlices(editor, [{ sliceId: "added", label: "New slice", variation: "Default" }])
	await expect(editor.preview.locator(".slice-highlight-label")).toHaveText("New slice • Default")

	await added.evaluate((element) => element.parentElement?.remove())
	await expect(editor.preview.locator(".slice-highlight")).toHaveCount(0)
})
