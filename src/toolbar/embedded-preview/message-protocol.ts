import { z } from "zod/mini"

const ackMessageType = "prismic:embedded-preview:ack"
export const readyMessage = { type: "prismic:embedded-preview:ready" } as const

const setRefMessageType = "prismic:embedded-preview:set-ref"

const setOverlayScaleMessageType = "prismic:embedded-preview:set-overlay-scale"
const setSlicesMessageType = "prismic:embedded-preview:set-slices"

const setCommentOverlayMessageType = "prismic:embedded-preview:set-comment-overlay"
const scrollToPinMessageType = "prismic:embedded-preview:scroll-to-pin"
const placeCommentMessageType = "prismic:embedded-preview:place-comment"
const setSliceOverlayMessageType = "prismic:embedded-preview:set-slice-overlay"
const scrollToSliceMessageType = "prismic:embedded-preview:scroll-to-slice"
const selectSliceMessageType = "prismic:embedded-preview:select-slice"
const selectPinMessageType = "prismic:embedded-preview:select-pin"
const deselectPinMessageType = "prismic:embedded-preview:deselect-pin"
const reportSelectedPinPositionMessageType = "prismic:embedded-preview:report-selected-pin-position"

const nonemptyStringSchema = z.string().check(z.minLength(1))
const ratioSchema = z.number().check(z.gte(0), z.lte(1))

const authorSchema = z.object({
	id: z.string(),
	name: z.optional(z.string()),
	avatarUrl: z.optional(z.string()),
})

const threadPinSchema = z.object({
	threadId: nonemptyStringSchema,
	author: authorSchema,
	resolved: z.boolean(),
	xRatio: ratioSchema,
	yRatio: ratioSchema,
})
export type ThreadPinData = z.infer<typeof threadPinSchema>

const ackMessageSchema = z.object({ type: z.literal(ackMessageType) })

const setRefMessageSchema = z.object({
	type: z.literal(setRefMessageType),
	token: nonemptyStringSchema,
})

const overlayScaleMessageSchema = z.object({
	type: z.literal(setOverlayScaleMessageType),
	uiScale: z.number().check(z.gt(0)),
})

const sliceMetadataSchema = z.object({
	sliceId: nonemptyStringSchema,
	label: z.string(),
	variation: z.optional(z.string()),
})
export type SliceMetadata = z.infer<typeof sliceMetadataSchema>

const slicesMessageSchema = z.object({
	type: z.literal(setSlicesMessageType),
	slices: z.array(sliceMetadataSchema),
})
type SetSlicesMessage = z.infer<typeof slicesMessageSchema>

const draftPinSchema = z.object({
	xRatio: ratioSchema,
	yRatio: ratioSchema,
})
export type PinPosition = z.infer<typeof draftPinSchema>

const commentOverlayMessageSchema = z.object({
	type: z.literal(setCommentOverlayMessageType),
	placementEnabled: z.boolean(),
	pins: z.array(threadPinSchema),
	draftAuthor: z.optional(authorSchema),
	selectedThreadId: z.optional(z.string()),
	draftPin: z.optional(draftPinSchema),
})

const scrollToPinMessageSchema = z.object({
	type: z.literal(scrollToPinMessageType),
	threadId: nonemptyStringSchema,
})

const sliceOverlayMessageSchema = z.object({
	type: z.literal(setSliceOverlayMessageType),
	sliceIds: z.array(nonemptyStringSchema),
	selectedSliceId: z.optional(nonemptyStringSchema),
})

const scrollToSliceMessageSchema = z.object({
	type: z.literal(scrollToSliceMessageType),
	sliceId: nonemptyStringSchema,
})

export type Author = z.infer<typeof authorSchema>

export const draftPinIdentity = { type: "draft" } as const
type DraftPinIdentity = typeof draftPinIdentity
type ThreadPinIdentity = { type: "thread"; threadId: string }
export type PinIdentity = DraftPinIdentity | ThreadPinIdentity
export interface PinRect {
	xRatio: number
	yRatio: number
	widthRatio: number
	heightRatio: number
}
type ReadyMessage = typeof readyMessage
type AckMessage = z.infer<typeof ackMessageSchema>
type SetRefMessage = z.infer<typeof setRefMessageSchema>
type SetOverlayScaleMessage = z.infer<typeof overlayScaleMessageSchema>
export type SetCommentOverlayMessage = z.infer<typeof commentOverlayMessageSchema>
type ScrollToPinMessage = z.infer<typeof scrollToPinMessageSchema>
export type SetSliceOverlayMessage = z.infer<typeof sliceOverlayMessageSchema>
type ScrollToSliceMessage = z.infer<typeof scrollToSliceMessageSchema>

interface PlaceCommentMessage {
	type: typeof placeCommentMessageType
	xRatio: number
	yRatio: number
	rect: PinRect
}
interface SelectSliceMessage {
	type: typeof selectSliceMessageType
	sliceId: string
}
interface SelectPinMessage {
	type: typeof selectPinMessageType
	pin: ThreadPinIdentity
	rect: PinRect
}
interface DeselectPinMessage {
	type: typeof deselectPinMessageType
	pin: PinIdentity
}
interface ReportSelectedPinPositionMessage {
	type: typeof reportSelectedPinPositionMessageType
	pin: PinIdentity
	rect: PinRect
	visible: boolean
}

export type Message =
	| ReadyMessage
	| AckMessage
	| SetRefMessage
	| SetOverlayScaleMessage
	| SetSlicesMessage
	| SetSliceOverlayMessage
	| ScrollToSliceMessage
	| SetCommentOverlayMessage
	| ScrollToPinMessage
	| PlaceCommentMessage
	| SelectPinMessage
	| SelectSliceMessage
	| DeselectPinMessage
	| ReportSelectedPinPositionMessage

export type MessageHandler = (event: MessageEvent<unknown>) => void
export type SubscribeToMessages = (handler: MessageHandler) => () => void
export type PostMessage = (message: Message) => void

export function createPlaceCommentMessage({
	xRatio,
	yRatio,
	rect,
}: Omit<PlaceCommentMessage, "type">): PlaceCommentMessage {
	return { type: placeCommentMessageType, xRatio, yRatio, rect }
}

export function createSelectSliceMessage(sliceId: string): SelectSliceMessage {
	return { type: selectSliceMessageType, sliceId }
}

export function createSelectPinMessage({
	pin,
	rect,
}: Omit<SelectPinMessage, "type">): SelectPinMessage {
	return { type: selectPinMessageType, pin, rect }
}

export function createDeselectPinMessage(pin: PinIdentity): DeselectPinMessage {
	return { type: deselectPinMessageType, pin }
}

export function createReportSelectedPinPositionMessage({
	pin,
	rect,
	visible,
}: Omit<ReportSelectedPinPositionMessage, "type">): ReportSelectedPinPositionMessage {
	return { type: reportSelectedPinPositionMessageType, pin, rect, visible }
}

export function isAckMessage(data: unknown): data is AckMessage {
	return z.validate(ackMessageSchema, data)
}

export function isSetRefMessage(data: unknown): data is SetRefMessage {
	return z.validate(setRefMessageSchema, data)
}

export function isOverlayScaleMessage(data: unknown): data is SetOverlayScaleMessage {
	return z.validate(overlayScaleMessageSchema, data)
}

export function isSetSlicesMessage(data: unknown): data is SetSlicesMessage {
	return z.validate(slicesMessageSchema, data)
}

export function isCommentOverlayMessage(data: unknown): data is SetCommentOverlayMessage {
	return z.validate(commentOverlayMessageSchema, data)
}

export function isScrollToPinMessage(data: unknown): data is ScrollToPinMessage {
	return z.validate(scrollToPinMessageSchema, data)
}

export function isSliceOverlayMessage(data: unknown): data is SetSliceOverlayMessage {
	return z.validate(sliceOverlayMessageSchema, data)
}

export function isScrollToSliceMessage(data: unknown): data is ScrollToSliceMessage {
	return z.validate(scrollToSliceMessageSchema, data)
}
