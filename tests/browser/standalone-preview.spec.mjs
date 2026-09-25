import { readFile } from "node:fs/promises"

import { test, expect } from "@playwright/test"

const siteURL = "https://customer.test/article"
const repository = "preview-repository.test"
const repositoryURL = `https://${repository}`
const previewCookie = "io.prismic.preview"
const sessionCookie = "io.prismic.previewSession"

async function setupStandalone({ page, context, request }, initialRef = "ref-1") {
	const fixture = await readFile(new URL("../fixtures/standalone.html", import.meta.url), "utf8")
	const state = { ref: initialRef, loads: [], pings: [], errors: [], unexpectedRequests: [] }
	page.on("pageerror", (error) => state.errors.push(error.message))

	// The repository iframe reads a real cross-site cookie to decide whether to fetch state.
	await context.addCookies([
		{
			name: sessionCookie,
			value: "standalone-session",
			url: repositoryURL,
			secure: true,
			sameSite: "None",
		},
	])
	await context.route("**/*", async (route) => {
		const url = new URL(route.request().url())
		if (url.href === siteURL) {
			const cookies = (await route.request().allHeaders()).cookie || ""
			const value = cookies.split("; ").find((cookie) => cookie.startsWith(`${previewCookie}=`))
			const ref =
				value &&
				JSON.parse(decodeURIComponent(value.slice(previewCookie.length + 1)))[repository]?.preview
			state.loads.push(ref || null)
			await route.fulfill({
				contentType: "text/html",
				body: fixture.replace("__CONTENT__", ref ? `Draft content: ${ref}` : "Published content"),
			})
		} else if (/\/(prismic\.js|toolbar\.js|iframe\.html)$/.test(url.pathname)) {
			// Serve actual build artifacts at their production URLs, including the cross-origin iframe.
			await route.fulfill({ response: await request.get(url.pathname) })
		} else if (url.origin === repositoryURL && url.pathname === "/toolbar/state") {
			await route.fulfill({
				json: {
					isAuthenticated: false,
					previewState: state.ref ? { ref: state.ref, title: "Standalone preview" } : null,
				},
			})
		} else if (
			url.origin === repositoryURL &&
			url.pathname === "/previews/standalone-session/ping"
		) {
			state.pings.push(url.searchParams.get("ref"))
			await route.fulfill({
				json: {
					ref: state.ref,
					reload: Boolean(state.ref && state.ref !== url.searchParams.get("ref")),
				},
			})
		} else {
			state.unexpectedRequests.push(url.href)
			await route.abort()
		}
	})
	return state
}

async function cookieValue(context, url, name) {
	const cookies = await context.cookies(url)
	const value = cookies.find((cookie) => cookie.name === name)?.value
	return value === undefined ? undefined : decodeURIComponent(value)
}

for (const ending of ["close button", "expired session"]) {
	test(`standalone preview starts, updates and ends via ${ending}`, async ({
		page,
		context,
		request,
	}) => {
		const state = await setupStandalone({ page, context, request })
		await page.goto(siteURL)

		// Initial synchronization must reload the customer page with the preview ref in its request.
		await expect(page.locator("#content")).toHaveText("Draft content: ref-1")
		await expect(page.locator(".PreviewMenu")).toBeVisible()
		expect(state.loads).toEqual([null, "ref-1"])
		expect(JSON.parse(await cookieValue(context, siteURL, previewCookie))).toEqual({
			[repository]: { preview: "ref-1" },
		})

		// Let the real polling timer, iframe fetch and MessageChannel deliver the new ref.
		state.ref = "ref-2"
		await expect(page.locator("#content")).toHaveText("Draft content: ref-2", { timeout: 10_000 })
		await expect(page.locator(".PreviewMenu")).toBeVisible()
		expect(state.pings).toContain("ref-1")
		expect(state.loads).toEqual([null, "ref-1", "ref-2"])
		expect(JSON.parse(await cookieValue(context, siteURL, previewCookie))).toEqual({
			[repository]: { preview: "ref-2" },
		})

		if (ending === "close button") await page.locator(".PreviewMenu > .x").click()
		else state.ref = null

		await expect(page.locator("#content")).toHaveText("Published content", { timeout: 10_000 })
		await expect(page.locator(".PreviewMenu")).toHaveCount(0)
		expect(await cookieValue(context, siteURL, previewCookie)).toBeUndefined()
		expect(await cookieValue(context, repositoryURL, sessionCookie)).toBeUndefined()
		expect(state.loads).toEqual([null, "ref-1", "ref-2", null])
		if (ending === "expired session") expect(state.pings).toContain("ref-2")

		// A fresh visit must stay out of preview after the repository session is cleared.
		await page.reload()
		await expect(page.locator("#content")).toHaveText("Published content")
		await expect(page.locator(".PreviewMenu")).toHaveCount(0)
		expect(state.loads).toEqual([null, "ref-1", "ref-2", null, null])
		expect(state.errors).toEqual([])
		expect(state.unexpectedRequests).toEqual([])
	})
}

test("an inactive standalone session preserves an existing site preview cookie", async ({
	page,
	context,
	request,
}) => {
	const state = await setupStandalone({ page, context, request }, null)
	const existingPreview = JSON.stringify({ [repository]: { preview: "another-tab-ref" } })
	await context.addCookies([
		{
			name: previewCookie,
			value: encodeURIComponent(existingPreview),
			url: siteURL,
			sameSite: "Lax",
		},
	])
	await page.goto(siteURL)

	// Session deletion confirms the real setup completed its inactive branch.
	await expect.poll(() => cookieValue(context, repositoryURL, sessionCookie)).toBeUndefined()
	expect(await cookieValue(context, siteURL, previewCookie)).toBe(existingPreview)
	await expect(page.locator("#content")).toHaveText("Draft content: another-tab-ref")
	await expect(page.locator(".PreviewMenu")).toHaveCount(0)
	expect(state.loads).toEqual(["another-tab-ref"])
	expect(state.pings).toEqual([])
	expect(state.errors).toEqual([])
	expect(state.unexpectedRequests).toEqual([])
})
