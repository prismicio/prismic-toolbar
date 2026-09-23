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

test("slice roots are selectable but gaps and covering popups are not", async ({ page }) => {
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
