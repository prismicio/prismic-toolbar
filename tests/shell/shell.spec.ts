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

	await repository.startPreview("ref-1")
	await context.addCookies([
		{ name: "is-logged-in", value: "true", url: repository.url, secure: true, sameSite: "None" },
	])
	expect(await page.evaluate(() => window.shell.getSession())).toEqual({
		session: repository.sessionID,
		authenticated: true,
	})

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
		authenticated: true,
	})
})

// The shell will serve every `prismic.js` version from one path: its messages must not change.
test("speaks a prefixed protocol and ignores unknown messages", async ({ page, repository }) => {
	await repository.startPreview("ref-1")
	await page.goto(websiteURL)

	const { ignored, answered } = await page.evaluate(async (url) => {
		const iframe = Object.assign(document.createElement("iframe"), { src: url })
		const loaded = new Promise((resolve) => iframe.addEventListener("load", resolve))
		document.body.append(iframe)
		await loaded

		const connect = (type: string) => {
			const { port1, port2 } = new MessageChannel()
			const messages: unknown[] = []
			port1.onmessage = ({ data }) => messages.push(data)
			iframe.contentWindow!.postMessage({ type }, "*", [port2])
			return { port: port1, messages }
		}
		const ignored = connect("prismic-toolbar:connect")
		const answered = connect("prismic:shell:connect")

		for (const message of [
			null,
			{ type: "getSession", id: 1, params: [] },
			{ type: "prismic:shell:unknown", id: 2, params: [] },
			{ type: "prismic:shell:toString", id: 3, params: [] },
			{ type: "prismic:shell:getSession", id: 4, params: [] },
			{ type: "prismic:shell:share", id: 5, params: ["not a URL", "Spring launch"] },
		]) {
			answered.port.postMessage(message)
		}
		// The shell answers in order, so unknown messages would have been answered by then.
		while (answered.messages.length < 3) await new Promise((resolve) => setTimeout(resolve, 50))

		return { ignored: ignored.messages, answered: answered.messages }
	}, repository.url + shellPath)

	expect(ignored).toEqual([])
	expect(answered).toEqual([
		{ type: "prismic:shell:ready" },
		{
			type: "prismic:shell:response",
			id: 4,
			result: { session: repository.sessionID, authenticated: false },
		},
		{ type: "prismic:shell:response", id: 5, error: expect.any(String) },
	])
})
