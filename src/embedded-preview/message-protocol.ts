export const readyMessage = { type: "prismic:embedded-preview:ready" } as const

export type Author = {
	id: string
	name?: string
	avatarUrl?: string
}

export type ThreadPinData = {
	threadId: string
	author: Author
	resolved: boolean
	xRatio: number
	yRatio: number
}

export type SliceMetadata = {
	sliceId: string
	label: string
	variation?: string
}

export type PinPosition = {
	xRatio: number
	yRatio: number
}

export const draftPinIdentity = { type: "draft" } as const
type DraftPinIdentity = typeof draftPinIdentity
type ThreadPinIdentity = { type: "thread"; threadId: string }
export type PinIdentity = DraftPinIdentity | ThreadPinIdentity
export type PinRect = {
	xRatio: number
	yRatio: number
	widthRatio: number
	heightRatio: number
}
type ReadyMessage = typeof readyMessage
type AckMessage = {
	type: "prismic:embedded-preview:ack"
}
type SetRefMessage = {
	type: "prismic:embedded-preview:set-ref"
	token: string
	// `false` when the editor keeps the preview mounted and expects an in-place update.
	reload?: boolean
}
type SetOverlayScaleMessage = {
	type: "prismic:embedded-preview:set-overlay-scale"
	uiScale: number
}
type SetSlicesMessage = {
	type: "prismic:embedded-preview:set-slices"
	slices: SliceMetadata[]
}
export type SetCommentOverlayMessage = {
	type: "prismic:embedded-preview:set-comment-overlay"
	placementEnabled: boolean
	pins: ThreadPinData[]
	draftAuthor?: Author
	selectedThreadId?: string
	draftPin?: PinPosition
}
type ScrollToPinMessage = {
	type: "prismic:embedded-preview:scroll-to-pin"
	threadId: string
}
type SetSliceOverlayMessage = {
	type: "prismic:embedded-preview:set-slice-overlay"
	selectedSliceId?: string
}
type ScrollToSliceMessage = {
	type: "prismic:embedded-preview:scroll-to-slice"
	sliceId: string
}

type PlaceCommentMessage = {
	type: "prismic:embedded-preview:place-comment"
	xRatio: number
	yRatio: number
	rect: PinRect
}
type SelectSliceMessage = {
	type: "prismic:embedded-preview:select-slice"
	sliceId: string
}
type SelectPinMessage = {
	type: "prismic:embedded-preview:select-pin"
	pin: ThreadPinIdentity
	rect: PinRect
}
type DeselectPinMessage = {
	type: "prismic:embedded-preview:deselect-pin"
	pin: PinIdentity
}
type ReportSelectedPinPositionMessage = {
	type: "prismic:embedded-preview:report-selected-pin-position"
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

// The editor is deployed on its own schedule: guards ignore unknown keys so it can add fields.
type UnknownObject = Record<string, unknown>
type Guard<T> = (value: unknown) => value is T

function isObject(value: unknown): value is UnknownObject {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
	return typeof value === "string"
}

function isNonEmptyString(value: unknown): value is string {
	return isString(value) && value.length > 0
}

function isBoolean(value: unknown): value is boolean {
	return typeof value === "boolean"
}

function isNumber(value: unknown): value is number {
	return Number.isFinite(value)
}

function isRatio(value: unknown): value is number {
	return isNumber(value) && value >= 0 && value <= 1
}

function isOptional<T>(value: unknown, guard: Guard<T>): value is T | undefined {
	return value === undefined || guard(value)
}

function isArrayOf<T>(value: unknown, guard: Guard<T>): value is T[] {
	// Spreading turns holes into `undefined`, which `every` would otherwise skip.
	return Array.isArray(value) && [...value].every(guard)
}

function isMessage(data: unknown, type: Message["type"]): data is UnknownObject {
	return isObject(data) && data.type === type
}

function isAuthor(value: unknown): value is Author {
	return (
		isObject(value) &&
		isString(value.id) &&
		isOptional(value.name, isString) &&
		isOptional(value.avatarUrl, isString)
	)
}

function isPinPosition(value: unknown): value is PinPosition {
	return isObject(value) && isRatio(value.xRatio) && isRatio(value.yRatio)
}

function isThreadPin(value: unknown): value is ThreadPinData {
	return (
		isObject(value) &&
		isNonEmptyString(value.threadId) &&
		isAuthor(value.author) &&
		isBoolean(value.resolved) &&
		isRatio(value.xRatio) &&
		isRatio(value.yRatio)
	)
}

function isSliceMetadata(value: unknown): value is SliceMetadata {
	return (
		isObject(value) &&
		isNonEmptyString(value.sliceId) &&
		isString(value.label) &&
		isOptional(value.variation, isString)
	)
}

export function isAckMessage(data: unknown): data is AckMessage {
	return isMessage(data, "prismic:embedded-preview:ack")
}

export function isSetRefMessage(data: unknown): data is SetRefMessage {
	return (
		isMessage(data, "prismic:embedded-preview:set-ref") &&
		isNonEmptyString(data.token) &&
		isOptional(data.reload, isBoolean)
	)
}

export function isOverlayScaleMessage(data: unknown): data is SetOverlayScaleMessage {
	return (
		isMessage(data, "prismic:embedded-preview:set-overlay-scale") &&
		isNumber(data.uiScale) &&
		data.uiScale > 0
	)
}

export function isSetSlicesMessage(data: unknown): data is SetSlicesMessage {
	return (
		isMessage(data, "prismic:embedded-preview:set-slices") &&
		isArrayOf(data.slices, isSliceMetadata)
	)
}

export function isCommentOverlayMessage(data: unknown): data is SetCommentOverlayMessage {
	return (
		isMessage(data, "prismic:embedded-preview:set-comment-overlay") &&
		isBoolean(data.placementEnabled) &&
		isArrayOf(data.pins, isThreadPin) &&
		isOptional(data.draftAuthor, isAuthor) &&
		isOptional(data.selectedThreadId, isString) &&
		isOptional(data.draftPin, isPinPosition)
	)
}

export function isScrollToPinMessage(data: unknown): data is ScrollToPinMessage {
	return (
		isMessage(data, "prismic:embedded-preview:scroll-to-pin") && isNonEmptyString(data.threadId)
	)
}

export function isSliceOverlayMessage(data: unknown): data is SetSliceOverlayMessage {
	return (
		isMessage(data, "prismic:embedded-preview:set-slice-overlay") &&
		isOptional(data.selectedSliceId, isNonEmptyString)
	)
}

export function isScrollToSliceMessage(data: unknown): data is ScrollToSliceMessage {
	return (
		isMessage(data, "prismic:embedded-preview:scroll-to-slice") && isNonEmptyString(data.sliceId)
	)
}
