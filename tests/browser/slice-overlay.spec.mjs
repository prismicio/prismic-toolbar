import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
	await page.goto("/overlay.html")
	await expect(page.frameLocator("iframe").locator('[data-thread-id="first"]')).toBeVisible()
})

test("highlight follows position changes under a stationary pointer", async ({ page }) => {
	const site = page.frameLocator("iframe")
	const slice = site.locator("#first-slice")
	const highlight = site.locator(".slice-highlight")
	await slice.hover({ position: { x: 500, y: 200 } })
	await expect(highlight).toHaveAttribute("data-slice-id", "first-slice")

	await slice.evaluate((element) => (element.style.transform = "translateY(40px)"))
	await expect.poll(() => highlight.boundingBox()).toEqual(await slice.boundingBox())

	// Moving out from under the pointer must clear hover without a pointer event.
	await slice.evaluate((element) => (element.style.transform = "translateY(500px)"))
	await expect(highlight).toHaveCount(0)
	await slice.evaluate((element) => (element.style.transform = ""))
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

test("tracking stops outside the preview and resumes on reentry", async ({ page }) => {
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
