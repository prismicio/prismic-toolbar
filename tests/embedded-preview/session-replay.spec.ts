import { expect, test } from "../infra"

test("captures cross-origin preview DOM and stops when the editor disables replay", async ({
	context,
	editor,
	page,
	requests,
}) => {
	// Exercise the real recorder without creating recordings in an Amplitude project.
	await context.route(/https:\/\/[^/]*amplitude\.com\//, (route) =>
		route.fulfill({
			json: {
				configs: {
					sessionReplay: {
						sr_sampling_config: { capture_enabled: true, sample_rate: 1 },
					},
				},
			},
			headers: { "access-control-allow-origin": "*" },
		}),
	)
	await editor.goto()
	await expect(editor.overlay).toBeAttached()
	expect(requests.some((url) => url.endsWith("/session-replay.js"))).toBe(false)
	await page.evaluate(() => {
		window.addEventListener("message", ({ data }) => {
			if (data?.type === "prismic:embedded-preview:session-replay-ready") {
				window.editor.send({ type: "amplitude-sr-iframe", action: "start" })
			}
		})
	})
	await editor.send({
		type: "prismic:embedded-preview:session-replay",
		config: {
			apiKey: "test-key",
			deviceId: "test-device",
			sessionId: Date.now(),
			sampleRate: 1,
			serverZone: "US",
			privacyConfig: { defaultMaskLevel: "light", unmaskSelector: ["*"] },
		},
	})
	await expect.poll(() => requests.some((url) => url.endsWith("/session-replay.js"))).toBe(true)
	await expect
		.poll(() => page.evaluate(() => JSON.stringify(window.editor.messages)))
		.toContain("first-slice")
	await editor.previewFrame.evaluate(() => {
		const marker = document.createElement("div")
		marker.id = "replay-iframe-marker"
		marker.textContent = "Unmasked preview text"
		const input = document.createElement("input")
		input.value = "Unmasked page title"
		document.body.append(input)
		document.body.append(marker)
	})
	await expect
		.poll(() => page.evaluate(() => JSON.stringify(window.editor.messages)))
		.toContain("replay-iframe-marker")
	await expect
		.poll(() => page.evaluate(() => JSON.stringify(window.editor.messages)))
		.toContain("Unmasked page title")
	await expect
		.poll(() => page.evaluate(() => JSON.stringify(window.editor.messages)))
		.toContain("Unmasked preview text")
	await editor.send({ type: "prismic:embedded-preview:session-replay" })
	await expect
		.poll(() =>
			editor.previewFrame.evaluate(
				() =>
					window.receivedMessages.filter(
						(message) => message === "prismic:embedded-preview:session-replay",
					).length,
			),
		)
		.toBe(2)
	await editor.previewFrame.evaluate(() => {
		const marker = document.createElement("div")
		marker.id = "after-replay-stopped"
		marker.textContent = "Should not record"
		document.body.append(marker)
	})
	// Allow the recorder's mutation batching interval to elapse.
	await page.waitForTimeout(500)
	expect(await page.evaluate(() => JSON.stringify(window.editor.messages))).not.toContain(
		"after-replay-stopped",
	)
})
