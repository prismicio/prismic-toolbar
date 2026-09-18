export const setOverlayScaleMessageType = "prismic:embedded-preview:set-overlay-scale"
export const setCommentOverlayMessageType = "prismic:embedded-preview:set-comment-overlay"
export const scrollToPinMessageType = "prismic:embedded-preview:scroll-to-pin"

export const placeCommentMessageType = "prismic:embedded-preview:place-comment"
export const selectPinMessageType = "prismic:embedded-preview:select-pin"
export const deselectPinMessageType = "prismic:embedded-preview:deselect-pin"
export const selectSliceMessageType = "prismic:embedded-preview:select-slice"
export const reportSelectedPinPositionMessageType =
	"prismic:embedded-preview:report-selected-pin-position"

export type SubscribeToOverlayMessages = (handleMessage: (data: unknown) => void) => () => void

export interface Author {
	id: string
	name?: string
	avatarUrl?: string
}
export interface Positioned {
	xRatio: number
	yRatio: number
}
export interface ThreadPin extends Positioned {
	threadId: string
	author: Author
	resolved: boolean
}
export interface CommentOverlayState {
	placementEnabled: boolean
	pins: ThreadPin[]
	draftAuthor?: Author
	selectedThreadId?: string
	draftPin?: Positioned
}
export type PinIdentity = { type: "draft" } | { type: "thread"; threadId: string }
export type RenderedPin = Positioned & {
	author: Author
	selected: boolean
	resolved?: boolean
} & PinIdentity
export interface PinRect {
	xRatio: number
	yRatio: number
	widthRatio: number
	heightRatio: number
}
export type OverlayEvent =
	| ({ type: typeof placeCommentMessageType; rect: PinRect } & Positioned)
	| { type: typeof selectPinMessageType; pin: PinIdentity; rect: PinRect }
	| { type: typeof deselectPinMessageType; pin: PinIdentity }
	| { type: typeof selectSliceMessageType; sliceId: string }
	| {
			type: typeof reportSelectedPinPositionMessageType
			pin: PinIdentity
			rect: PinRect
			visible: boolean
	  }

export function isOverlayScaleMessage(
	data: unknown,
): data is { type: typeof setOverlayScaleMessageType; uiScale: number } {
	return (
		isObject(data) && data.type === setOverlayScaleMessageType && isPositiveNumber(data.uiScale)
	)
}

export function isCommentOverlayMessage(
	data: unknown,
): data is CommentOverlayState & { type: typeof setCommentOverlayMessageType } {
	return (
		isObject(data) &&
		data.type === setCommentOverlayMessageType &&
		typeof data.placementEnabled === "boolean" &&
		Array.isArray(data.pins) &&
		data.pins.every(isThreadPin) &&
		isOptionalAuthor(data.draftAuthor) &&
		isOptionalString(data.selectedThreadId) &&
		(data.draftPin === undefined || (isPositioned(data.draftPin) && isAuthor(data.draftAuthor)))
	)
}

export function isScrollToPinMessage(
	data: unknown,
): data is { type: typeof scrollToPinMessageType; threadId: string } {
	return (
		isObject(data) &&
		data.type === scrollToPinMessageType &&
		typeof data.threadId === "string" &&
		data.threadId.length > 0
	)
}

function isThreadPin(pin: unknown): pin is ThreadPin {
	return (
		isPositionedAuthor(pin) &&
		typeof pin.threadId === "string" &&
		pin.threadId.length > 0 &&
		typeof pin.resolved === "boolean"
	)
}

function isPositionedAuthor(
	value: unknown,
): value is Positioned & { author: Author } & Record<string, unknown> {
	return isPositioned(value) && isAuthor(value.author)
}

function isPositioned(value: unknown): value is Positioned & Record<string, unknown> {
	return isObject(value) && isRatio(value.xRatio) && isRatio(value.yRatio)
}

function isOptionalAuthor(author: unknown): author is Author | undefined {
	return author === undefined || isAuthor(author)
}

function isAuthor(author: unknown): author is Author {
	return (
		isObject(author) &&
		typeof author.id === "string" &&
		isOptionalString(author.name) &&
		isOptionalString(author.avatarUrl)
	)
}

function isOptionalString(value: unknown): value is string | undefined {
	return value === undefined || typeof value === "string"
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object"
}

function isRatio(value: unknown): value is number {
	return typeof value === "number" && value >= 0 && value <= 1
}

function isPositiveNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0
}
