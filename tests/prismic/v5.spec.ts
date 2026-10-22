import { expect, previewCookieName, sessionCookieName, test, type Website } from "../infra"

test.beforeEach(({ website }) => {
	website.scriptQuery += "&v=5"
})

/** Waits until the toolbar followed the session, then checks the website renders `ref`. */
async function expectPreview(website: Website, ref: string) {
	await expect(website.content).toHaveText(`Draft content: ${ref}`, { timeout: 10_000 })
	await expect(website.previewBar).toBeVisible()
	expect((await website.cookie(previewCookieName))?.value).toBe(ref)
}

async function expectNoPreview(website: Website) {
	await expect(website.content).toHaveText("Published content", { timeout: 10_000 })
	await expect(website.previewBar).toHaveCount(0)
	expect(await website.cookie(previewCookieName)).toBeUndefined()
	expect(await website.cookie(sessionCookieName)).toBeUndefined()
}

test("follows the session with ping, without the iframe", async ({
	repository,
	website,
	requests,
}) => {
	await website.storePreview("ref-1")
	await website.goto()

	await expectPreview(website, "ref-1")
	await expect(website.previewBar).toContainText(repository.title)
	await expect(website.previewBar).toContainText("Live preview")
	await expect(website.previewBar.getByRole("button", { name: "Share" })).toHaveCount(0)
	expect(repository.pings).toContain("ref-1")
	expect(website.loads).toEqual(["ref-1"])
	const pings = new RegExp(`^${repository.url}/previews/${repository.sessionID}/ping\\?ref=`)
	expect(requests.filter((url) => url.startsWith(repository.url) && !pings.test(url))).toEqual([])
})

test("reloads with the session's new ref", async ({ repository, website }) => {
	await website.storePreview("ref-1")
	await website.goto()
	await expectPreview(website, "ref-1")

	repository.ref = "ref-2"

	await expectPreview(website, "ref-2")
	expect(website.loads).toEqual(["ref-1", "ref-2"])
})

test("lets the website handle updates without reloading", async ({ repository, website }) => {
	await website.storePreview("ref-1")
	await website.goto({ events: "handle" })
	await expect(website.previewBar).toBeVisible()

	repository.ref = "ref-2"

	await expect
		.poll(() => website.recordedEvents(), { timeout: 10_000 })
		.toEqual([["prismicPreviewUpdate", "ref-2"]])
	expect((await website.cookie(previewCookieName))?.value).toBe("ref-2")
	// Later pings send the ref the website now renders.
	await expect.poll(() => repository.pings.at(-1), { timeout: 10_000 }).toBe("ref-2")
	expect(website.loads).toEqual(["ref-1"])
})

test("ends the preview when the session closes", async ({ repository, website }) => {
	await website.storePreview("ref-1")
	await website.goto()
	await expectPreview(website, "ref-1")

	repository.ref = null

	await expectNoPreview(website)
	expect(website.loads).toEqual(["ref-1", null])
})

test("ends the preview when another tab exits it", async ({ website, context }) => {
	await website.storePreview("ref-1")
	await website.goto()
	await expectPreview(website, "ref-1")

	await context.clearCookies({ name: sessionCookieName })

	await expectNoPreview(website)
})

test("ignores pings of a session another tab replaced", async ({ website, context }) => {
	await website.storePreview("ref-1")
	await website.goto()
	await expectPreview(website, "ref-1")
	const cors = { "access-control-allow-origin": "*" }
	await context.route(
		(url) => url.pathname.endsWith("/ping"),
		async (route) => {
			if (route.request().url().includes("/new-session/")) {
				return route.fulfill({ headers: cors, json: { ref: "ref-1", reload: false } })
			}
			// Another tab starts a session while this ping is in flight, which the old session closes.
			await context.addCookies([
				{ name: sessionCookieName, value: "new-session", url: website.url, secure: true },
			])
			await route.fulfill({ headers: cors, json: { reload: false, close: true } })
		},
	)
	const newSession = context.waitForEvent("request", (request) =>
		request.url().includes("/previews/new-session/ping"),
	)

	await newSession

	await expectPreview(website, "ref-1")
	expect((await website.cookie(sessionCookieName))?.value).toBe("new-session")
})

test("exits the preview", async ({ website }) => {
	await website.storePreview("ref-1")
	await website.goto()
	await expectPreview(website, "ref-1")

	await website.previewBar.getByRole("button", { name: "Exit preview" }).click()

	await expectNoPreview(website)
	expect(website.loads).toEqual(["ref-1", null])
})

test("waits for a slow ping before the next", async ({ repository, website, context }) => {
	let inFlight = 0
	let maxInFlight = 0
	// Slower than the 3s interval.
	await context.route(
		(url) => url.pathname.endsWith("/ping"),
		async (route) => {
			maxInFlight = Math.max(maxInFlight, ++inFlight)
			await new Promise((resolve) => setTimeout(resolve, 3500))
			inFlight--
			await route.fallback()
		},
	)
	await website.storePreview("ref-1")
	await website.goto()
	await expect.poll(() => inFlight).toBe(1)

	await website.page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")))

	await expect.poll(() => repository.pings.length, { timeout: 10_000 }).toBe(1)
	expect(maxInFlight).toBe(1)
})

test("retries after failed pings", async ({ repository, website, context }) => {
	let failures = 0
	// A network error, then a server error.
	await context.route(
		(url) => url.pathname.endsWith("/ping"),
		(route) => (failures++ ? route.fulfill({ status: 500 }) : route.abort()),
		{ times: 2 },
	)
	await website.storePreview("ref-1")
	repository.ref = "ref-2"

	await website.goto()

	await expectPreview(website, "ref-2")
	expect(failures).toBe(2)
})
