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

export interface Author {
	id: string
	name?: string
	avatarUrl?: string
}

export interface ThreadPinData {
	threadId: string
	author: Author
	resolved: boolean
	xRatio: number
	yRatio: number
}

export interface SliceMetadata {
	sliceId: string
	label: string
	variation?: string
}

export interface PinPosition {
	xRatio: number
	yRatio: number
}

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
interface AckMessage {
	type: typeof ackMessageType
}
interface SetRefMessage {
	type: typeof setRefMessageType
	token: string
	// `false` when the editor keeps the preview mounted and expects an in-place update.
	reload?: boolean
}
interface SetOverlayScaleMessage {
	type: typeof setOverlayScaleMessageType
	uiScale: number
}
interface SetSlicesMessage {
	type: typeof setSlicesMessageType
	slices: SliceMetadata[]
}
export interface SetCommentOverlayMessage {
	type: typeof setCommentOverlayMessageType
	placementEnabled: boolean
	pins: ThreadPinData[]
	draftAuthor?: Author
	selectedThreadId?: string
	draftPin?: PinPosition
}
interface ScrollToPinMessage {
	type: typeof scrollToPinMessageType
	threadId: string
}
interface SetSliceOverlayMessage {
	type: typeof setSliceOverlayMessageType
	selectedSliceId?: string
}
interface ScrollToSliceMessage {
	type: typeof scrollToSliceMessageType
	sliceId: string
}

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

function isMessage(data: unknown, type: string): data is UnknownObject {
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
	return isMessage(data, ackMessageType)
}

export function isSetRefMessage(data: unknown): data is SetRefMessage {
	return (
		isMessage(data, setRefMessageType) &&
		isNonEmptyString(data.token) &&
		isOptional(data.reload, isBoolean)
	)
}

export function isOverlayScaleMessage(data: unknown): data is SetOverlayScaleMessage {
	return isMessage(data, setOverlayScaleMessageType) && isNumber(data.uiScale) && data.uiScale > 0
}

export function isSetSlicesMessage(data: unknown): data is SetSlicesMessage {
	return isMessage(data, setSlicesMessageType) && isArrayOf(data.slices, isSliceMetadata)
}

export function isCommentOverlayMessage(data: unknown): data is SetCommentOverlayMessage {
	return (
		isMessage(data, setCommentOverlayMessageType) &&
		isBoolean(data.placementEnabled) &&
		isArrayOf(data.pins, isThreadPin) &&
		isOptional(data.draftAuthor, isAuthor) &&
		isOptional(data.selectedThreadId, isString) &&
		isOptional(data.draftPin, isPinPosition)
	)
}

export function isScrollToPinMessage(data: unknown): data is ScrollToPinMessage {
	return isMessage(data, scrollToPinMessageType) && isNonEmptyString(data.threadId)
}

export function isSliceOverlayMessage(data: unknown): data is SetSliceOverlayMessage {
	return (
		isMessage(data, setSliceOverlayMessageType) &&
		isOptional(data.selectedSliceId, isNonEmptyString)
	)
}

export function isScrollToSliceMessage(data: unknown): data is ScrollToSliceMessage {
	return isMessage(data, scrollToSliceMessageType) && isNonEmptyString(data.sliceId)
}
