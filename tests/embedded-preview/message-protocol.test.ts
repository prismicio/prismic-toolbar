import { describe, expect, it } from "vitest"

import {
	isAckMessage,
	isCommentOverlayMessage,
	isOverlayScaleMessage,
	isScrollToPinMessage,
	isScrollToSliceMessage,
	isSetRefMessage,
	isSetSlicesMessage,
	isSliceOverlayMessage,
} from "../../src/embedded-preview/message-protocol"

type Payload = Record<string, unknown>

/** Deletes the key instead of setting a value. */
const missing = Symbol("missing")

/** An array with a hole, as `[, ]`. */
const sparse: unknown[] = []
sparse.length = 1

const nonObjects = [undefined, null, "message", 1, true, [], [{}]]
const nonStrings = [missing, undefined, 1, null, {}, [], true]
const nonNumbers = [missing, undefined, "0.5", null, NaN, Infinity, -Infinity, {}, [], true]
const nonBooleans = [missing, undefined, "true", 1, 0, null, {}, []]
const nonArrays = [missing, undefined, sparse, {}, "[]", null, 1]
const nonRatios = [-0.01, 1.01, ...nonNumbers]
const badOptionals = [1, null, {}]
const badRequiredObjects = [missing, null, "object", [], 1]
const badOptionalObjects = [null, "object", [], 1]

const author = { id: "author-1", name: "Ada", avatarUrl: "https://example.com/ada.png" }
const threadPin = { threadId: "thread-1", author, resolved: false, xRatio: 0.25, yRatio: 0.75 }
const slice = { sliceId: "slice-1", label: "Hero", variation: "default" }

function set(payload: Payload, path: string, value: unknown): Payload {
	const copy = structuredClone(payload)
	const keys = path.split(".")
	const last = keys.pop()!
	let parent = copy
	for (const key of keys) parent = parent[key] as Payload
	if (value === missing) delete parent[last]
	else parent[last] = value
	return copy
}

type Case = {
	guard: (data: unknown) => boolean
	/** Accepted payloads. Invalid ones are built from the first. */
	valid: Payload[]
	/** Rejected values per dot-separated path. */
	invalid: Record<string, unknown[]>
}

const cases: Record<string, Case> = {
	isAckMessage: {
		guard: isAckMessage,
		valid: [
			{ type: "prismic:embedded-preview:ack" },
			{ type: "prismic:embedded-preview:ack", extra: 1 },
		],
		invalid: { type: [missing, "prismic:embedded-preview:ready", "", 1, null] },
	},
	isSetRefMessage: {
		guard: isSetRefMessage,
		valid: [
			{ type: "prismic:embedded-preview:set-ref", token: "ref-token", reload: false },
			{ type: "prismic:embedded-preview:set-ref", token: "t" },
			{ type: "prismic:embedded-preview:set-ref", token: "t", reload: true },
			{ type: "prismic:embedded-preview:set-ref", token: "t", reload: undefined },
			{ type: "prismic:embedded-preview:set-ref", token: "t", extra: 1 },
		],
		invalid: {
			type: [missing, "prismic:embedded-preview:ack", 1],
			token: ["", ...nonStrings],
			reload: ["false", 0, null, {}],
		},
	},
	isOverlayScaleMessage: {
		guard: isOverlayScaleMessage,
		valid: [
			{ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 1.5 },
			{ type: "prismic:embedded-preview:set-overlay-scale", uiScale: Number.MIN_VALUE },
			{ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 1e9 },
		],
		invalid: {
			type: [missing, "prismic:embedded-preview:set-slices"],
			uiScale: [0, -0, -1, ...nonNumbers],
		},
	},
	isSetSlicesMessage: {
		guard: isSetSlicesMessage,
		valid: [
			{ type: "prismic:embedded-preview:set-slices", slices: [slice] },
			{ type: "prismic:embedded-preview:set-slices", slices: [] },
			{
				type: "prismic:embedded-preview:set-slices",
				slices: [
					{ sliceId: "s", label: "" },
					{ sliceId: "s", label: "", variation: undefined },
				],
			},
			{ type: "prismic:embedded-preview:set-slices", slices: [{ ...slice, extra: 1 }] },
		],
		invalid: {
			type: [missing, "prismic:embedded-preview:set-ref"],
			slices: nonArrays,
			"slices.0": [null, "slice", [], 1],
			"slices.1": [null, {}],
			"slices.0.sliceId": ["", ...nonStrings],
			"slices.0.label": nonStrings,
			"slices.0.variation": badOptionals,
		},
	},
	isCommentOverlayMessage: {
		guard: isCommentOverlayMessage,
		valid: [
			{
				type: "prismic:embedded-preview:set-comment-overlay",
				placementEnabled: true,
				pins: [threadPin],
				draftAuthor: author,
				selectedThreadId: "thread-1",
				draftPin: { xRatio: 0.5, yRatio: 0.5 },
			},
			{ type: "prismic:embedded-preview:set-comment-overlay", placementEnabled: false, pins: [] },
			{
				type: "prismic:embedded-preview:set-comment-overlay",
				placementEnabled: false,
				pins: [],
				draftAuthor: undefined,
				selectedThreadId: undefined,
				draftPin: undefined,
			},
			{
				type: "prismic:embedded-preview:set-comment-overlay",
				placementEnabled: false,
				pins: [{ ...threadPin, author: { id: "" }, xRatio: 0, yRatio: 1 }],
				draftAuthor: { id: "", name: undefined, avatarUrl: undefined },
				selectedThreadId: "",
				draftPin: { xRatio: 1, yRatio: 0 },
			},
			{
				type: "prismic:embedded-preview:set-comment-overlay",
				placementEnabled: true,
				pins: [{ ...threadPin, extra: 1, author: { ...author, extra: 1 } }],
				draftPin: { xRatio: 0, yRatio: 0, extra: 1 },
				extra: 1,
			},
		],
		invalid: {
			type: [missing, "prismic:embedded-preview:scroll-to-pin"],
			placementEnabled: nonBooleans,
			pins: nonArrays,
			"pins.0": [null, "pin", [], 1],
			"pins.1": [null, {}],
			"pins.0.threadId": ["", ...nonStrings],
			"pins.0.author": badRequiredObjects,
			"pins.0.author.id": nonStrings,
			"pins.0.author.name": badOptionals,
			"pins.0.author.avatarUrl": badOptionals,
			"pins.0.resolved": nonBooleans,
			"pins.0.xRatio": nonRatios,
			"pins.0.yRatio": nonRatios,
			draftAuthor: badOptionalObjects,
			"draftAuthor.id": nonStrings,
			"draftAuthor.name": badOptionals,
			"draftAuthor.avatarUrl": badOptionals,
			selectedThreadId: badOptionals,
			draftPin: badOptionalObjects,
			"draftPin.xRatio": nonRatios,
			"draftPin.yRatio": nonRatios,
		},
	},
	isScrollToPinMessage: {
		guard: isScrollToPinMessage,
		valid: [
			{ type: "prismic:embedded-preview:scroll-to-pin", threadId: "thread-1" },
			{ type: "prismic:embedded-preview:scroll-to-pin", threadId: "t", extra: 1 },
		],
		invalid: {
			type: [missing, "prismic:embedded-preview:scroll-to-slice"],
			threadId: ["", ...nonStrings],
		},
	},
	isSliceOverlayMessage: {
		guard: isSliceOverlayMessage,
		valid: [
			{ type: "prismic:embedded-preview:set-slice-overlay", selectedSliceId: "slice-1" },
			{ type: "prismic:embedded-preview:set-slice-overlay" },
			{ type: "prismic:embedded-preview:set-slice-overlay", selectedSliceId: undefined },
			{ type: "prismic:embedded-preview:set-slice-overlay", extra: 1 },
		],
		invalid: {
			type: [missing, "prismic:embedded-preview:set-slices"],
			selectedSliceId: ["", ...badOptionals],
		},
	},
	isScrollToSliceMessage: {
		guard: isScrollToSliceMessage,
		valid: [
			{ type: "prismic:embedded-preview:scroll-to-slice", sliceId: "slice-1" },
			{ type: "prismic:embedded-preview:scroll-to-slice", sliceId: "s", extra: 1 },
		],
		invalid: {
			type: [missing, "prismic:embedded-preview:select-slice"],
			sliceId: ["", ...nonStrings],
		},
	},
}

describe.each(Object.entries(cases))("%s", (_name, { guard, valid, invalid }) => {
	it.each(valid)("accepts %j", (payload) => {
		expect(guard(payload)).toBe(true)
	})

	it.each(nonObjects.map((value) => [value]))("rejects %o", (value) => {
		expect(guard(value)).toBe(false)
	})

	it.each(
		Object.entries(invalid).flatMap(([path, values]) => values.map((value) => [path, value])),
	)("rejects %s = %o", (path, value) => {
		expect(guard(set(valid[0], path as string, value))).toBe(false)
	})
})
