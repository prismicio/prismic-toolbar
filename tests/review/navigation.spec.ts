import { expect, test } from "@playwright/test"

import { observeReviewNavigation } from "../../src/embedded-preview/review-navigation"
import { detectMode } from "../../src/lib/env"

test("recognizes review frames and reports initial, SPA, and back navigation", async ({ page }) => {
	const messages: { type: string; url?: string }[] = []
	await page.exposeFunction("captureReviewNavigation", (message) => messages.push(message))
	await page.route("http://website.test/**", (route) =>
		route.fulfill({ contentType: "text/html", body: "<h1>Website preview</h1>" }),
	)
	await page.goto("http://website.test/shared")
	await page.addScriptTag({
		content: `(${observeReviewNavigation.toString()})(window.captureReviewNavigation)`,
	})
	await expect.poll(() => messages.at(-1)?.url).toBe("http://website.test/shared")
	await page.evaluate(() => history.pushState({}, "", "/another"))
	await expect.poll(() => messages.at(-1)?.url).toBe("http://website.test/another")
	await page.evaluate(() => history.replaceState({}, "", "/replaced"))
	await expect.poll(() => messages.at(-1)?.url).toBe("http://website.test/replaced")
	await page.goBack()
	await expect.poll(() => messages.at(-1)?.url).toBe("http://website.test/shared")
	const mode = await page.evaluate(
		`(${detectMode.toString()})({ self: {}, top: {}, name: "prismic:embedded-preview:review" })`,
	)
	expect(mode).toBe("embedded-push")
})

test("pauses before full navigation but ignores links opened in another tab", async ({ page }) => {
	const messages: { type: string; url?: string }[] = []
	await page.exposeFunction("captureReviewNavigation", (message) => messages.push(message))
	await page.route("http://website.test/**", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: '<a href="/another">Next page</a><a href="/external" target="_blank">New tab</a>',
		}),
	)
	await page.goto("http://website.test/shared")
	await page.addScriptTag({
		content: `(${observeReviewNavigation.toString()})(window.captureReviewNavigation)`,
	})
	await page.getByText("New tab").click()
	expect(messages.filter((message) => message.type.endsWith(":navigating"))).toHaveLength(0)
	await page.getByText("Next page").click()
	await expect
		.poll(() => messages.some((message) => message.type.endsWith(":navigating")))
		.toBe(true)
})
