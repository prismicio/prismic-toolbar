import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
	await page.goto("/overlay.html")
	await expect(page.frameLocator("iframe").locator('[data-thread-id="first"]')).toBeVisible()
})

test("highlight refreshes position-only changes on pointer movement", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const slice = site.locator("#first-slice")
	const highlight = site.locator(".slice-highlight")
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")

	const box = await slice.boundingBox()
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

test("highlight follows a slice inside a scrolling container", async ({ page }) => {
	await sendSlices(page, [{ sliceId: "scrolling-slice", label: "Scrolling slice" }])
	const site = page.frameLocator("iframe")
	await site.locator("body").evaluate((body) => {
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
	const slice = site.locator("#scrolling-slice")
	const highlight = site.locator(".slice-highlight")
	await slice.hover({ position: { x: 100, y: 150 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "scrolling-slice")
	await site.locator("#scroller").evaluate((element) => (element.scrollTop = 50))
	await expect.poll(() => highlight.boundingBox()).toEqual(await slice.boundingBox())
})

test("highlight and selection use updated roots and marker IDs", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const highlight = site.locator(".slice-highlight")
	await site.locator("#first-slice").hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
	await site.locator("#first-slice").evaluate((element) => {
		const replacement = element.cloneNode(true)
		replacement.style.height = "450px"
		element.replaceWith(replacement)
	})
	await expect
		.poll(() => highlight.boundingBox())
		.toEqual(await site.locator("#first-slice").boundingBox())

	await site.locator("body").evaluate((body) => {
		const walker = document.createTreeWalker(body, NodeFilter.SHOW_COMMENT)
		while (walker.nextNode()) {
			walker.currentNode.data = walker.currentNode.data.replace("first-slice", "renamed-slice")
		}
	})
	await expect(highlight).toHaveCount(0)
	await sendSlices(page, [
		{ sliceId: "renamed-slice", label: "Hero", variation: "Default" },
		{ sliceId: "second-slice", label: "Call to action", variation: "Centered" },
	])
	await expect(highlight).toHaveAttribute("data-slice-id", "renamed-slice")
	await site.locator("#first-slice").click({ position: { x: 500, y: 200 } })
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.fixture.messages.findLast(
					(message) => message.type === "prismic:embedded-preview:select-slice",
				),
			),
		)
		.toEqual({ type: "prismic:embedded-preview:select-slice", sliceId: "renamed-slice" })

	await site.locator("#first-slice").evaluate((element) => element.remove())
	await expect(highlight).toHaveAttribute("data-slice-id", "second-slice")
})

test("highlight does not poll while idle and clears outside the preview", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const slice = site.locator("#first-slice")
	const highlight = site.locator(".slice-highlight")
	await slice.evaluate((element) => {
		const measure = element.getBoundingClientRect.bind(element)
		element.measurements = 0
		element.getBoundingClientRect = () => {
			element.measurements++
			return measure()
		}
	})
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toBeVisible()
	const measurementsWhileIdle = await slice.evaluate(async (element) => {
		// Let any initial ResizeObserver delivery settle before checking for polling.
		await new Promise(requestAnimationFrame)
		const before = element.measurements
		for (let frame = 0; frame < 4; frame++) {
			await new Promise(requestAnimationFrame)
		}
		return element.measurements - before
	})
	expect(measurementsWhileIdle).toBe(0)
	await page.mouse.move(20, 850)
	await expect(highlight).toHaveCount(0)
	const measurementsWhileOutside = await slice.evaluate(async (element) => {
		const before = element.measurements
		for (let frame = 0; frame < 4; frame++) {
			await new Promise(requestAnimationFrame)
		}
		return element.measurements - before
	})
	expect(measurementsWhileOutside).toBe(0)
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
})

test("comment placement takes precedence over slice hover and selection", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const highlight = site.locator(".slice-highlight")
	await page.getByRole("button", { name: "Place comment", exact: true }).click()
	const placement = site.getByRole("button", { name: "Place a comment here" })
	await placement.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveCount(0)
	await placement.click({ position: { x: 500, y: 200 } })
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.fixture.messages.some(
					(message) => message.type === "prismic:embedded-preview:place-comment",
				),
			),
		)
		.toBe(true)
	expect(
		await page.evaluate(() =>
			window.fixture.messages.some(
				(message) => message.type === "prismic:embedded-preview:select-slice",
			),
		),
	).toBe(false)
})

async function sliceSelections(page) {
	return page.evaluate(() =>
		window.fixture.messages.filter(
			(message) => message.type === "prismic:embedded-preview:select-slice",
		),
	)
}

test("hovering and clicking a comment pin clears slice hover without selecting a slice", async ({
	page,
}) => {
	const site = page.frameLocator("iframe")
	const slice = site.locator("#first-slice")
	const highlight = site.locator(".slice-highlight")
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toBeVisible()
	const pin = site.locator('[data-thread-id="first"]')
	await pin.hover()
	await expect(highlight).toHaveCount(0)
	await pin.click()
	expect(await sliceSelections(page)).toEqual([])
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")
})

test("text can be selected by dragging without selecting the slice", async ({ page }) => {
	const site = page.frameLocator("iframe")
	await site.locator("#first-slice").evaluate((element) => {
		const text = document.createElement("span")
		text.id = "selectable-text"
		text.textContent = "Select this page text by dragging across it."
		text.style.cssText =
			"position:absolute;top:100px;left:350px;font:24px monospace;user-select:text"
		element.append(text)
	})
	const text = site.locator("#selectable-text")
	const box = await text.boundingBox()
	await page.mouse.move(box.x + 1, box.y + box.height / 2)
	await page.mouse.down()
	await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 15 })
	await page.mouse.up()
	expect(await text.evaluate(() => window.getSelection().toString())).toContain(
		"Select this page text",
	)
	expect(await sliceSelections(page)).toEqual([])
	await site.locator("#first-slice").click({ position: { x: 600, y: 250 } })
	await expect
		.poll(() => sliceSelections(page))
		.toEqual([{ type: "prismic:embedded-preview:select-slice", sliceId: "first-slice" }])
})

test("native controls remain usable without selecting the slice", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const slice = site.locator("#first-slice")
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
		element.querySelector("form").addEventListener("submit", (event) => {
			event.preventDefault()
			element.dataset.submitted = "true"
		})
	})

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

	await slice.click({ position: { x: 600, y: 350 } })
	await expect
		.poll(() => sliceSelections(page))
		.toEqual([{ type: "prismic:embedded-preview:select-slice", sliceId: "first-slice" }])
})

test("links and button roles keep their actions without selecting the slice", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const slice = site.locator("#first-slice")
	await slice.evaluate((element) => {
		element.innerHTML = `
			<a href="#first-slice"><span>Go to slice</span></a>
			<div role="button" tabindex="0"><span>Custom button</span></div>
			<div role="link" tabindex="0"><span>Custom link</span></div>
		`
		for (const control of element.querySelectorAll("[role]")) {
			control.addEventListener("click", () => (control.dataset.clicked = "true"))
		}
	})

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

	await slice.click({ position: { x: 600, y: 350 } })
	await expect
		.poll(() => sliceSelections(page))
		.toEqual([{ type: "prismic:embedded-preview:select-slice", sliceId: "first-slice" }])
})

test("slice roots are selectable but gaps and covering popups are not", async ({ page }) => {
	await sendSlices(page, [{ sliceId: "split", label: "Split" }])
	const site = page.frameLocator("iframe")
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
	await expect
		.poll(() => sliceSelections(page))
		.toEqual([{ type: "prismic:embedded-preview:select-slice", sliceId: "split" }])
	await site.locator("#split-slice").hover({ position: { x: 100, y: 75 } })
	await expect(site.locator(".slice-highlight")).toHaveCount(0)
	await site.locator("#split-slice").click({ position: { x: 100, y: 75 } })
	expect(await sliceSelections(page)).toHaveLength(1)
	await site.locator("body").evaluate((body) => {
		const modal = document.createElement("div")
		modal.id = "modal"
		modal.style.cssText = "position:fixed;inset:0;background:white;z-index:10"
		body.append(modal)
	})
	await site.locator("#modal").click({ position: { x: 450, y: 125 } })
	await expect(site.locator(".slice-highlight")).toHaveCount(0)
	expect(await sliceSelections(page)).toHaveLength(1)
})

test("hover and click agree for nested gaps and overflowing content", async ({ page }) => {
	await sendSlices(page, [
		{ sliceId: "outer", label: "Outer" },
		{ sliceId: "inner", label: "Inner" },
	])
	const site = page.frameLocator("iframe")
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
	]) {
		await outer.hover({ position: { x: 100, y } })
		await expect(highlight).toHaveAttribute("data-slice-id", sliceId)
		await outer.click({ position: { x: 100, y } })
		await expect.poll(async () => (await sliceSelections(page)).at(-1)?.sliceId).toBe(sliceId)
	}
	await site.locator("#overflow").hover()
	await expect(highlight).toHaveAttribute("data-slice-id", "outer")
	await site.locator("#overflow").click()
	await expect
		.poll(async () => (await sliceSelections(page)).map(({ sliceId }) => sliceId))
		.toEqual(["inner", "outer", "outer", "outer"])
})

test("same-size DOM replacement remains highlightable and selectable", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const slice = site.locator("#first-slice")
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(site.locator(".slice-highlight")).toHaveAttribute("data-slice-id", "first-slice")
	await slice.evaluate((element) => element.replaceWith(element.cloneNode(true)))
	await slice.hover({ position: { x: 501, y: 200 } })
	await expect(site.locator(".slice-highlight")).toHaveAttribute("data-slice-id", "first-slice")
	await slice.click({ position: { x: 501, y: 200 } })
	await expect
		.poll(() => sliceSelections(page))
		.toEqual([{ type: "prismic:embedded-preview:select-slice", sliceId: "first-slice" }])
})

async function sendSlices(page, slices) {
	await page.evaluate((slices) => {
		document
			.querySelector("iframe")
			.contentWindow.postMessage(
				{ type: "prismic:embedded-preview:set-slices", slices },
				location.origin,
			)
	}, slices)
}

test("labels are compact, inset inside the highlight and scroll with the slice", async ({
	page,
}, testInfo) => {
	const site = page.frameLocator("iframe")
	const highlight = site.locator(".slice-highlight")
	const label = site.locator(".slice-highlight-label")
	await site.locator("#first-slice").hover({ position: { x: 500, y: 200 } })
	await expect(label).toHaveText("Hero • Default")
	await expect(label).toBeInViewport()

	await site.locator("#second-slice").hover({ position: { x: 500, y: 100 } })
	await expect(label).toHaveText("Call to action • Centered")
	const bounds = await highlight.boundingBox()
	const labelBounds = await label.boundingBox()
	expect(labelBounds.x).toBe(bounds.x + 6)
	expect(labelBounds.y).toBe(bounds.y + 6)
	expect(labelBounds.height).toBe(24)
	await page.screenshot({ path: testInfo.outputPath("slice-highlight.png") })
	await site.locator("#second-slice").evaluate(() => window.scrollBy(0, 40))
	await expect.poll(async () => (await label.boundingBox())?.y).toBe(labelBounds.y - 40)
	await page.getByRole("button", { name: "Scale overlay" }).click()
	await site.locator("#second-slice").hover({ position: { x: 500, y: 100 } })
	await expect.poll(async () => (await label.boundingBox())?.height).toBe(labelBounds.height * 2)
})

test("metadata updates clear stale highlights and exclude other documents", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const first = site.locator("#first-slice")
	const second = site.locator("#second-slice")
	const highlight = site.locator(".slice-highlight")
	const label = site.locator(".slice-highlight-label")
	await first.hover({ position: { x: 500, y: 200 } })
	await expect(label).toHaveText("Hero • Default")

	await sendSlices(page, [{ sliceId: "first-slice", label: "Banner", variation: "Wide" }])
	await expect(label).toHaveText("Banner • Wide")
	await second.hover({ position: { x: 500, y: 100 } })
	await expect(highlight).toHaveCount(0)
	await second.click({ position: { x: 500, y: 100 } })
	expect(await sliceSelections(page)).toEqual([])

	await first.hover({ position: { x: 500, y: 200 } })
	await sendSlices(page, [])
	await expect(highlight).toHaveCount(0)
	await first.click({ position: { x: 500, y: 200 } })
	expect(await sliceSelections(page)).toEqual([])

	// The old document's DOM can remain present while the next preview loads.
	await sendSlices(page, [{ sliceId: "second-slice", label: "Footer" }])
	await first.hover({ position: { x: 501, y: 200 } })
	await expect(highlight).toHaveCount(0)
	await second.hover({ position: { x: 500, y: 100 } })
	await expect(label).toHaveText("Footer")
	await second.click({ position: { x: 500, y: 100 } })
	await expect
		.poll(() => sliceSelections(page))
		.toEqual([{ type: "prismic:embedded-preview:select-slice", sliceId: "second-slice" }])
})

test("newly rendered slices require current Page Builder metadata", async ({ page }) => {
	const site = page.frameLocator("iframe")
	await site.locator("body").evaluate((body) => {
		const root = document.createElement("div")
		root.innerHTML = `
			<!--prismic-slice-start:added-->
			<section id="added" style="position:absolute;top:100px;left:400px;width:300px;height:200px;background:white">Added slice</section>
			<!--prismic-slice-end:added-->
		`
		body.append(root)
	})
	await site.locator("#added").hover()
	await expect(site.locator(".slice-highlight")).toHaveCount(0)
	await sendSlices(page, [{ sliceId: "added", label: "New slice", variation: "Default" }])
	await expect(site.locator(".slice-highlight-label")).toHaveText("New slice • Default")
	await site.locator("#added").evaluate((element) => element.parentElement.remove())
	await expect(site.locator(".slice-highlight")).toHaveCount(0)
})


async function sendSliceMessage(page, message) {
	await page.evaluate((message) => {
		document.querySelector("iframe").contentWindow.postMessage(message, location.origin)
	}, message)
}

async function selectSlice(page, sliceId) {
	await sendSliceMessage(page, {
		type: "prismic:embedded-preview:set-selected-slice",
		selectedSliceId: sliceId,
	})
}

async function scrollToSlice(page, sliceId) {
	await sendSliceMessage(page, { type: "prismic:embedded-preview:scroll-to-slice", sliceId })
}

async function settleSliceNavigation(site) {
	await site.locator("body").evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)))
}

test("selected highlight persists outside the slice and clears independently of hover", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const selected = site.locator('.slice-highlight[data-selected="true"]')
	await selectSlice(page, "first-slice")
	await expect(selected).toHaveAttribute("data-slice-id", "first-slice")
	await site.locator("#second-slice").hover({ position: { x: 500, y: 100 } })
	await expect(site.locator(".slice-highlight")).toHaveCount(2)
	await page.mouse.move(20, 850)
	await expect(site.locator(".slice-highlight")).toHaveCount(1)
	await selectSlice(page, undefined)
	await expect(selected).toHaveCount(0)
})

test("selection reports do not scroll and visible slices stay in place", async ({ page }) => {
	const site = page.frameLocator("iframe")
	await page.mouse.move(20, 850)
	await selectSlice(page, "second-slice")
	await expect(site.locator('[data-selected="true"]')).toHaveAttribute("data-slice-id", "second-slice")
	await settleSliceNavigation(site)
	expect(await site.locator("body").evaluate(() => window.scrollY)).toBe(0)
	await scrollToSlice(page, "first-slice")
	await settleSliceNavigation(site)
	expect(await site.locator("body").evaluate(() => window.scrollY)).toBe(0)
})

test("clipped slices smaller than the viewport are centered", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
	const site = page.frameLocator("iframe")
	await scrollToSlice(page, "second-slice")
	await expect.poll(() => site.locator("#second-slice").evaluate((element) => {
		const rect = element.getBoundingClientRect()
		return Math.round(rect.top + rect.height / 2 - window.innerHeight / 2)
	})).toBe(0)
})

test("tall multi-root slices align their combined top with the inset", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "reduce" })
	const site = page.frameLocator("iframe")
	await site.locator("body").evaluate((body) => {
		const root = document.createElement("div")
		root.style.cssText = "position:absolute;top:1200px;left:100px;width:400px"
		root.innerHTML = `
			<!--prismic-slice-start:tall-->
			<section id="tall-first" style="height:450px"></section>
			<section id="tall-last" style="height:450px"></section>
			<!--prismic-slice-end:tall-->
		`
		body.append(root)
	})
	await sendSlices(page, [{ sliceId: "tall", label: "Tall" }])
	await selectSlice(page, "tall")
	await expect(site.locator('[data-selected="true"]')).toHaveAttribute("data-slice-id", "tall")
	await scrollToSlice(page, "tall")
	await expect.poll(() => site.locator("#tall-first").evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(16)
	await page.getByRole("button", { name: "Scale overlay" }).click()
	await scrollToSlice(page, "tall")
	// It remains clipped, so the scaled inset is applied on the next request.
	await expect.poll(() => site.locator("#tall-first").evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBe(32)
})

test("slice navigation reveals nested scroll containers before the page", async ({ page }) => {
	const site = page.frameLocator("iframe")
	await site.locator("body").evaluate((body) => {
		const scroller = document.createElement("div")
		scroller.id = "navigation-scroller"
		scroller.style.cssText = "position:absolute;top:100px;left:100px;width:400px;height:300px;overflow:auto"
		scroller.innerHTML = `
			<div style="height:700px"></div>
			<!--prismic-slice-start:nested-->
			<section id="nested" style="height:100px">Nested slice</section>
			<!--prismic-slice-end:nested-->
			<div style="height:700px"></div>
		`
		body.append(scroller)
	})
	await sendSlices(page, [{ sliceId: "nested", label: "Nested" }])
	await scrollToSlice(page, "nested")
	await expect.poll(() => site.locator("#navigation-scroller").evaluate((element) => element.scrollTop)).toBe(600)
	expect(await site.locator("body").evaluate(() => window.scrollY)).toBe(0)
})

test("metadata excludes foreign or removed slices from selection and navigation", async ({ page }) => {
	const site = page.frameLocator("iframe")
	await page.mouse.move(20, 850)
	await sendSlices(page, [{ sliceId: "first-slice", label: "Hero" }])
	await selectSlice(page, "second-slice")
	await scrollToSlice(page, "second-slice")
	await settleSliceNavigation(site)
	await expect(site.locator(".slice-highlight")).toHaveCount(0)
	expect(await site.locator("body").evaluate(() => window.scrollY)).toBe(0)
	await selectSlice(page, "first-slice")
	await expect(site.locator('[data-selected="true"]')).toHaveCount(1)
	await sendSlices(page, [])
	await expect(site.locator('[data-selected="true"]')).toHaveCount(0)
})

test("user input cancels pending slice navigation", async ({ page }) => {
	const site = page.frameLocator("iframe")
	await scrollToSlice(page, "second-slice")
	await site.locator("body").evaluate(async () => {
		await new Promise(requestAnimationFrame)
		await new Promise(requestAnimationFrame)
		window.dispatchEvent(new WheelEvent("wheel"))
	})
	await settleSliceNavigation(site)
	expect(await site.locator("body").evaluate(() => window.scrollY)).toBe(0)
})
