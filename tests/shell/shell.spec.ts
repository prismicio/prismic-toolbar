import { build, type Rolldown } from "vite"

import type * as client from "../../src/lib/shell-client"
import { version } from "../../vite.config"
import { expect, sessionCookieName, test } from "../infra"

declare global {
	interface Window {
		PrismicShell: typeof client
		shell: client.Shell
	}
}

const websiteURL = "https://website.test"
const shellPath = `/prismic-toolbar/${version}/shell.html`
let clientScript: string

test.beforeAll(async () => {
	// No toolbar bundle uses the client yet, so build it on its own.
	const output = (await build({
		configFile: false,
		logLevel: "warn",
		build: {
			write: false,
			lib: { entry: "src/lib/shell-client.ts", formats: ["iife"], name: "PrismicShell" },
		},
	})) as Rolldown.RolldownOutput[]
	clientScript = output[0]!.output[0].code
})

// A website page that loads the client, served cross-site from the repository.
test.beforeEach(async ({ context }) => {
	await context.route(`${websiteURL}/`, (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<!doctype html><title>Website</title><script>${clientScript}</script>`,
		}),
	)
})

test("reads, shares, and closes the repository's session", async ({
	page,
	repository,
	context,
}) => {
	const pageURL = `${websiteURL}/blog/post#intro`
	const share = () =>
		page.evaluate(
			(pageURL) =>
				window.shell.share(pageURL, "Spring launch").catch((error: Error) => error.message),
			pageURL,
		)

	let stateRequests = 0
	context.on("request", (request) => {
		if (request.url() === `${repository.url}/toolbar/state`) stateRequests++
	})

	await page.goto(websiteURL)
	await page.evaluate(async (url) => {
		window.shell = await window.PrismicShell.connectShell(url)
	}, repository.url + shellPath)

	// No session yet.
	expect(await page.evaluate(() => window.shell.getSession())).toEqual({
		session: null,
		authenticated: false,
	})
	expect(await share()).toBe("No active preview session to share.")
	expect(stateRequests).toBe(0)

	// Prismic tells whether the user is signed in.
	await repository.startPreview("ref-1")
	expect(await page.evaluate(() => window.shell.getSession())).toEqual({
		session: repository.sessionID,
		authenticated: true,
	})
	repository.authenticated = false
	expect(await page.evaluate(() => window.shell.getSession())).toEqual({
		session: repository.sessionID,
		authenticated: false,
	})
	expect(stateRequests).toBe(2)

	// Shared once per session and page.
	expect(await share()).toBe(`${repository.url}/previews/s/share-id`)
	expect(await share()).toBe(`${repository.url}/previews/s/share-id`)
	expect(repository.shares).toEqual([
		{
			sessionId: repository.sessionID,
			pageURL,
			title: "Spring launch",
			imageName: `blog/post#intro${repository.sessionID}.jpg`,
		},
	])

	// Prismic may write the session cookie on any parent domain or path.
	await context.addCookies(
		[
			{ domain: ".prismic.io", path: "/" },
			{ domain: repository.host, path: "/prismic-toolbar/" },
		].map((variant) => ({
			...variant,
			name: sessionCookieName,
			value: repository.sessionID,
			secure: true,
			sameSite: "None" as const,
		})),
	)
	await page.evaluate(() => window.shell.closeSession())
	const sessionCookies = (await context.cookies()).filter(({ name }) => name === sessionCookieName)
	expect(sessionCookies).toEqual([])
	expect(await page.evaluate(() => window.shell.getSession())).toEqual({
		session: null,
		authenticated: false,
	})
	expect(stateRequests).toBe(2)
})
