import { describe, expect, it } from "vitest"

import {
	isCommentOverlayMessage,
	isOverlayScaleMessage,
	isScrollToPinMessage,
} from "./overlay-messages"

const author = { id: "author", name: "Test Author" }
const message = {
	type: "prismic:embedded-preview:set-comment-overlay",
	placementEnabled: false,
	pins: [{ threadId: "thread", xRatio: 0, yRatio: 1, author, resolved: false }],
}

describe("incoming overlay messages", () => {
	it("accepts boundary coordinates and optional draft/author fields", () => {
		expect(isCommentOverlayMessage(message)).toBe(true)
		expect(
			isCommentOverlayMessage({
				...message,
				draftPin: { xRatio: 0.5, yRatio: 0.5 },
				draftAuthor: author,
			}),
		).toBe(true)
		expect(isCommentOverlayMessage({ ...message, pins: [] })).toBe(true)
	})

	it.each([
		null,
		undefined,
		{},
		[],
		"message",
		{ ...message, type: "other" },
		{ ...message, placementEnabled: 1 },
		{ ...message, pins: {} },
		{ ...message, selectedThreadId: 12 },
		{ ...message, draftAuthor: { name: "Missing ID" } },
		{ ...message, draftPin: { xRatio: 0.5, yRatio: 0.5 } },
	])("rejects malformed state: %j", (value) => {
		expect(isCommentOverlayMessage(value)).toBe(false)
	})

	it.each([
		{ xRatio: -0.01 },
		{ yRatio: 1.01 },
		{ xRatio: NaN },
		{ yRatio: Infinity },
		{ threadId: "" },
		{ resolved: "false" },
		{ author: { id: "a", avatarUrl: 12 } },
	])("rejects malformed pins: %j", (fields) => {
		expect(isCommentOverlayMessage({ ...message, pins: [{ ...message.pins[0], ...fields }] })).toBe(
			false,
		)
	})

	it("accepts only finite positive scales", () => {
		for (const uiScale of [0.5, 1, 2])
			expect(
				isOverlayScaleMessage({ type: "prismic:embedded-preview:set-overlay-scale", uiScale }),
			).toBe(true)
		for (const uiScale of [0, -1, NaN, Infinity, "1"])
			expect(
				isOverlayScaleMessage({ type: "prismic:embedded-preview:set-overlay-scale", uiScale }),
			).toBe(false)
	})

	it("requires a nonempty thread ID for scroll requests", () => {
		expect(
			isScrollToPinMessage({ type: "prismic:embedded-preview:scroll-to-pin", threadId: "a" }),
		).toBe(true)
		expect(
			isScrollToPinMessage({ type: "prismic:embedded-preview:scroll-to-pin", threadId: "" }),
		).toBe(false)
	})
})
