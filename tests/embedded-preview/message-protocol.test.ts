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

const author = { id: "author-1", name: "Ada", avatarUrl: "https://example.com/ada.png" }
const threadPin = { threadId: "thread-1", author, resolved: false, xRatio: 0.25, yRatio: 0.75 }
const slice = { sliceId: "slice-1", label: "Hero", variation: "default" }

/** Values every guard rejects in place of the whole payload. */
const nonObjects = [undefined, null, "message", 1, true, [], [{}]]

/** Values a number field rejects, whatever its range. */
const nonNumbers = ["0.5", null, undefined, NaN, Infinity, -Infinity, {}, [], true]

const nonStrings = [1, null, undefined, {}, [], true]
const nonBooleans = ["true", 1, 0, null, undefined, {}, []]
const nonArrays = [{}, "[]", null, undefined, 1]

/** An array with a hole, as `[, ]`. */
const sparse: unknown[] = []
sparse.length = 1

type Path = (string | number)[]
type Container = Record<string | number, unknown>

/** Copies `payload` and calls `edit` with the parent of `path` and its last key. */
function edit(
	payload: Payload,
	path: Path,
	change: (parent: Container, key: string | number) => void,
) {
	const copy = structuredClone(payload)
	let parent = copy as Container
	for (const key of path.slice(0, -1)) parent = parent[key] as Container
	change(parent, path.at(-1)!)
	return copy
}

function set(payload: Payload, path: Path, value: unknown): Payload {
	return edit(payload, path, (parent, key) => (parent[key] = value))
}

function omit(payload: Payload, path: Path): Payload {
	return edit(payload, path, (parent, key) => delete parent[key])
}

interface Case {
	guard: (data: unknown) => boolean
	valid: Payload
	/** Other accepted payloads: optional fields left out, boundary values, unknown keys. */
	alsoValid: Payload[]
	/** Paths that must be present. */
	required: Path[]
	/** Rejected values per path. */
	invalid: [path: Path, values: unknown[]][]
}

const cases: Record<string, Case> = {
	isAckMessage: {
		guard: isAckMessage,
		valid: { type: "prismic:embedded-preview:ack" },
		alsoValid: [{ type: "prismic:embedded-preview:ack", extra: 1 }],
		required: [["type"]],
		invalid: [[["type"], ["prismic:embedded-preview:ready", "", 1, null]]],
	},
	isSetRefMessage: {
		guard: isSetRefMessage,
		valid: { type: "prismic:embedded-preview:set-ref", token: "ref-token", reload: false },
		alsoValid: [
			{ type: "prismic:embedded-preview:set-ref", token: "t" },
			{ type: "prismic:embedded-preview:set-ref", token: "t", reload: true },
			{ type: "prismic:embedded-preview:set-ref", token: "t", reload: undefined },
			{ type: "prismic:embedded-preview:set-ref", token: "t", extra: 1 },
		],
		required: [["type"], ["token"]],
		invalid: [
			[["type"], ["prismic:embedded-preview:ack", 1]],
			[["token"], ["", ...nonStrings]],
			[["reload"], ["false", 0, null, {}]],
		],
	},
	isOverlayScaleMessage: {
		guard: isOverlayScaleMessage,
		valid: { type: "prismic:embedded-preview:set-overlay-scale", uiScale: 1.5 },
		alsoValid: [
			{ type: "prismic:embedded-preview:set-overlay-scale", uiScale: Number.MIN_VALUE },
			{ type: "prismic:embedded-preview:set-overlay-scale", uiScale: 1e9 },
		],
		required: [["type"], ["uiScale"]],
		invalid: [
			[["type"], ["prismic:embedded-preview:set-slices"]],
			[["uiScale"], [0, -0, -1, ...nonNumbers]],
		],
	},
	isSetSlicesMessage: {
		guard: isSetSlicesMessage,
		valid: { type: "prismic:embedded-preview:set-slices", slices: [slice] },
		alsoValid: [
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
		required: [["type"], ["slices"], ["slices", 0, "sliceId"], ["slices", 0, "label"]],
		invalid: [
			[["type"], ["prismic:embedded-preview:set-ref"]],
			[["slices"], [sparse, ...nonArrays]],
			[
				["slices", 0],
				[null, "slice", [], 1],
			],
			[
				["slices", 1],
				[null, {}],
			],
			[
				["slices", 0, "sliceId"],
				["", ...nonStrings],
			],
			[["slices", 0, "label"], nonStrings],
			[
				["slices", 0, "variation"],
				[1, null, {}],
			],
		],
	},
	isCommentOverlayMessage: {
		guard: isCommentOverlayMessage,
		valid: {
			type: "prismic:embedded-preview:set-comment-overlay",
			placementEnabled: true,
			pins: [threadPin],
			draftAuthor: author,
			selectedThreadId: "thread-1",
			draftPin: { xRatio: 0.5, yRatio: 0.5 },
		},
		alsoValid: [
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
		required: [
			["type"],
			["placementEnabled"],
			["pins"],
			["pins", 0, "threadId"],
			["pins", 0, "author"],
			["pins", 0, "author", "id"],
			["pins", 0, "resolved"],
			["pins", 0, "xRatio"],
			["pins", 0, "yRatio"],
			["draftAuthor", "id"],
			["draftPin", "xRatio"],
			["draftPin", "yRatio"],
		],
		invalid: [
			[["type"], ["prismic:embedded-preview:scroll-to-pin"]],
			[["placementEnabled"], nonBooleans],
			[["pins"], [sparse, ...nonArrays]],
			[
				["pins", 0],
				[null, "pin", [], 1],
			],
			[
				["pins", 1],
				[null, {}],
			],
			[
				["pins", 0, "threadId"],
				["", ...nonStrings],
			],
			[
				["pins", 0, "author"],
				[null, "author", [], 1],
			],
			[["pins", 0, "author", "id"], nonStrings],
			[
				["pins", 0, "author", "name"],
				[1, null, {}],
			],
			[
				["pins", 0, "author", "avatarUrl"],
				[1, null, {}],
			],
			[["pins", 0, "resolved"], nonBooleans],
			[
				["pins", 0, "xRatio"],
				[-0.01, 1.01, ...nonNumbers],
			],
			[
				["pins", 0, "yRatio"],
				[-0.01, 1.01, ...nonNumbers],
			],
			[["draftAuthor"], [null, "author", [], 1]],
			[["draftAuthor", "id"], nonStrings],
			[
				["draftAuthor", "name"],
				[1, null, {}],
			],
			[
				["draftAuthor", "avatarUrl"],
				[1, null, {}],
			],
			[["selectedThreadId"], [1, null, {}]],
			[["draftPin"], [null, "pin", [], 1]],
			[
				["draftPin", "xRatio"],
				[-0.01, 1.01, ...nonNumbers],
			],
			[
				["draftPin", "yRatio"],
				[-0.01, 1.01, ...nonNumbers],
			],
		],
	},
	isScrollToPinMessage: {
		guard: isScrollToPinMessage,
		valid: { type: "prismic:embedded-preview:scroll-to-pin", threadId: "thread-1" },
		alsoValid: [{ type: "prismic:embedded-preview:scroll-to-pin", threadId: "t", extra: 1 }],
		required: [["type"], ["threadId"]],
		invalid: [
			[["type"], ["prismic:embedded-preview:scroll-to-slice"]],
			[["threadId"], ["", ...nonStrings]],
		],
	},
	isSliceOverlayMessage: {
		guard: isSliceOverlayMessage,
		valid: { type: "prismic:embedded-preview:set-slice-overlay", selectedSliceId: "slice-1" },
		alsoValid: [
			{ type: "prismic:embedded-preview:set-slice-overlay" },
			{ type: "prismic:embedded-preview:set-slice-overlay", selectedSliceId: undefined },
			{ type: "prismic:embedded-preview:set-slice-overlay", extra: 1 },
		],
		required: [["type"]],
		invalid: [
			[["type"], ["prismic:embedded-preview:set-slices"]],
			[["selectedSliceId"], ["", 1, null, {}]],
		],
	},
	isScrollToSliceMessage: {
		guard: isScrollToSliceMessage,
		valid: { type: "prismic:embedded-preview:scroll-to-slice", sliceId: "slice-1" },
		alsoValid: [{ type: "prismic:embedded-preview:scroll-to-slice", sliceId: "s", extra: 1 }],
		required: [["type"], ["sliceId"]],
		invalid: [
			[["type"], ["prismic:embedded-preview:select-slice"]],
			[["sliceId"], ["", ...nonStrings]],
		],
	},
}

describe.each(Object.entries(cases))(
	"%s",
	(_name, { guard, valid, alsoValid, required, invalid }) => {
		it("accepts a valid payload", () => {
			expect(guard(valid)).toBe(true)
		})

		it.each(alsoValid.map((payload) => [JSON.stringify(payload), payload]))(
			"accepts %s",
			(_label, payload) => {
				expect(guard(payload)).toBe(true)
			},
		)

		it.each(nonObjects.map((value) => [String(value), value]))("rejects %s", (_label, value) => {
			expect(guard(value)).toBe(false)
		})

		it.each(required.map((path) => [path.join("."), path]))(
			"rejects a missing %s",
			(_label, path) => {
				expect(guard(omit(valid, path))).toBe(false)
			},
		)

		it.each(
			invalid.flatMap(([path, values]) =>
				values.map((value) => [path.join("."), String(value), path, value] as const),
			),
		)("rejects %s = %s", (_path, _label, path, value) => {
			expect(guard(set(valid, path, value))).toBe(false)
		})
	},
)
