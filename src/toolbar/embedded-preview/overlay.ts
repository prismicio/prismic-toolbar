import { appendCSS, readyDOM, shadow } from "@common"

import {
	isOverlayScaleMessage,
	isCommentOverlayMessage,
	isScrollToPinMessage,
	placeCommentMessageType,
	selectPinMessageType,
	deselectPinMessageType,
	reportSelectedPinPositionMessageType,
} from "./overlay-messages"
import type {
	Author,
	CommentOverlayState,
	Positioned,
	PinIdentity,
	PinRect,
	RenderedPin,
	OverlayEvent,
} from "./overlay-messages"

import overlayStyles from "./overlay.css?inline"

const boundaryPadding = 4

export class EmbeddedPreviewOverlay {
	parentOrigin: string
	uiScale: number
	commentState: CommentOverlayState
	lastPositionMessage: string | undefined
	scrollToThreadId: string | undefined
	root: ShadowRoot | HTMLDivElement | undefined
	host: HTMLElement | undefined
	surface: HTMLDivElement | undefined
	pins: HTMLDivElement | undefined
	cursorPin: HTMLButtonElement | undefined
	positionReportFrame: number | undefined
	resizeObserver: ResizeObserver | undefined
	reportSelectedPinPositionSoon: () => void
	handleScroll: () => void
	handleResize: () => void

	constructor({ parentOrigin }: { parentOrigin: string }) {
		this.parentOrigin = parentOrigin
		this.uiScale = 1
		this.commentState = emptyCommentOverlayState()
		this.lastPositionMessage = undefined
		this.scrollToThreadId = undefined
		this.root = undefined
		this.host = undefined
		this.surface = undefined
		this.pins = undefined
		this.cursorPin = undefined

		this.positionReportFrame = undefined
		this.reportSelectedPinPositionSoon = () => {
			if (this.positionReportFrame !== undefined) return

			this.positionReportFrame = window.requestAnimationFrame(() => {
				this.positionReportFrame = undefined
				this.reportSelectedPinPosition()
			})
		}
		// Pins are document-positioned and move with native scrolling. Scrolling only
		// needs to keep the Editor-hosted comment bubble anchored to the selected pin.
		this.handleScroll = () => {
			this.reportSelectedPinPositionSoon()
		}
		this.handleResize = () => {
			this.renderPinPositions()
			this.reportSelectedPinPositionSoon()
		}

		this.setup()
	}

	handleMessage(data: unknown) {
		if (isOverlayScaleMessage(data)) {
			if (this.uiScale === data.uiScale) return
			this.uiScale = data.uiScale
			this.applyOverlayScale()
			return
		}

		if (isCommentOverlayMessage(data)) {
			const nextState = normalizeCommentOverlayState(data)
			const previousSelectedPin = selectedPinKey(this.commentState)
			const selectedPinChanged = previousSelectedPin !== selectedPinKey(nextState)
			this.commentState = nextState
			if (selectedPinChanged) {
				this.lastPositionMessage = undefined
			}
			this.render()
			return
		}

		if (isScrollToPinMessage(data)) {
			this.scrollToThreadId = data.threadId
			this.scrollSelectedPinIntoView()
		}
	}

	async setup() {
		await readyDOM()

		// Use a zero-sized document anchor so pins scroll natively without adding a
		// full-document overlay element that could affect the website's layout.
		this.root = shadow({
			id: "prismic-embedded-preview-overlay",
			style: {
				position: "absolute",
				top: 0,
				left: 0,
				width: 0,
				height: 0,
				zIndex: 2147483646,
				pointerEvents: "none",
			},
		})
		this.host = "host" in this.root ? (this.root.host as HTMLElement) : this.root
		this.applyOverlayScale()
		appendCSS(this.root, overlayStyles)

		this.surface = document.createElement("div")
		this.surface.className = "surface"
		this.pins = document.createElement("div")
		this.pins.className = "pins"
		this.surface.appendChild(this.pins)
		this.root.appendChild(this.surface)

		this.handleDocumentClick = this.handleDocumentClick.bind(this)
		document.addEventListener("click", this.handleDocumentClick)
		window.addEventListener("scroll", this.handleScroll, true)
		window.addEventListener("resize", this.handleResize)

		this.resizeObserver = new ResizeObserver(() => {
			this.renderPinPositions()
			this.reportSelectedPinPositionSoon()
		})
		this.resizeObserver.observe(document.documentElement)
		this.resizeObserver.observe(document.body)

		this.render()
	}

	render() {
		if (!this.surface || !this.pins) return

		this.renderPlacementLayer()
		this.renderPins()
		this.scrollSelectedPinIntoView()
		this.reportSelectedPinPositionSoon()
	}

	renderPlacementLayer() {
		if (!this.surface || !this.pins) return
		const existingLayer = this.surface.querySelector(".placement-layer")

		if (!this.commentState.placementEnabled) {
			if (existingLayer) existingLayer.remove()
			this.removeCursorPin()
			return
		}

		if (existingLayer) return

		const layer = document.createElement("button")
		layer.type = "button"
		layer.className = "placement-layer"
		layer.setAttribute("aria-label", "Place a comment here")
		layer.addEventListener("click", (event) => this.placeComment(event))
		layer.addEventListener("mousemove", (event) => this.renderCursorPin(event))
		layer.addEventListener("mouseenter", (event) => this.renderCursorPin(event))
		layer.addEventListener("mouseleave", () => this.removeCursorPin())
		this.surface.insertBefore(layer, this.pins)
	}

	renderPins() {
		if (!this.pins) return
		const pins = this.pins
		pins.textContent = ""

		this.commentState.pins.forEach((pin) => {
			pins.appendChild(
				this.createPin({
					...pin,
					selected: pin.threadId === this.commentState.selectedThreadId,
					type: "thread",
				}),
			)
		})

		if (this.commentState.draftPin && this.commentState.draftAuthor) {
			pins.appendChild(
				this.createPin({
					...this.commentState.draftPin,
					author: this.commentState.draftAuthor,
					selected: true,
					type: "draft",
				}),
			)
		}
	}

	renderPinPositions() {
		if (!this.pins || !this.host) return
		const host = this.host

		this.pins.querySelectorAll<HTMLButtonElement>(".pin").forEach((pin) => {
			positionPin(
				pin,
				{
					xRatio: Number(pin.dataset.xRatio),
					yRatio: Number(pin.dataset.yRatio),
				},
				this.uiScale,
				host,
			)
		})
	}

	createPin(pin: RenderedPin) {
		const button = document.createElement("button")
		button.type = "button"
		button.className = "pin"
		button.dataset.pinType = pin.type
		button.dataset.selected = String(pin.selected)
		button.dataset.resolved = String(Boolean(pin.resolved))
		button.dataset.xRatio = String(pin.xRatio)
		button.dataset.yRatio = String(pin.yRatio)
		button.setAttribute(
			"aria-label",
			pin.type === "thread" ? `Open comment by ${pin.author.name || "author"}` : "New comment",
		)

		if (pin.type === "thread") {
			button.dataset.threadId = pin.threadId
			button.addEventListener("click", (event) => {
				event.stopPropagation()
				const selected = button.dataset.selected === "true"
				button.dataset.selected = String(!selected)

				if (selected) {
					this.post({
						type: deselectPinMessageType,
						pin: { type: "thread", threadId: pin.threadId },
					})
				} else {
					this.post({
						type: selectPinMessageType,
						pin: { type: "thread", threadId: pin.threadId },
						rect: getPinRect(button),
					})
				}
			})
		} else {
			button.disabled = true
		}

		button.appendChild(createPinContent(pin.author))
		if (this.host) positionPin(button, pin, this.uiScale, this.host)
		return button
	}

	placeComment(event: MouseEvent) {
		event.stopPropagation()

		if (this.commentState.draftPin) {
			this.post({
				type: deselectPinMessageType,
				pin: { type: "draft" },
			})
			return
		}

		const { width, height } = measureDocument()
		if (width === 0 || height === 0) return

		const position = {
			xRatio: clamp(event.pageX / width),
			yRatio: clamp(event.pageY / height),
		}

		this.post({
			type: placeCommentMessageType,
			...position,
			rect: getPinRectFromPosition(position, this.uiScale),
		})
	}

	renderCursorPin(event: MouseEvent) {
		if (!this.commentState.draftAuthor || !this.root) return

		if (!this.cursorPin) {
			this.cursorPin = this.createPin({
				xRatio: 0,
				yRatio: 0,
				author: this.commentState.draftAuthor,
				selected: false,
				type: "draft",
			})
			this.cursorPin.classList.add("cursor-pin")
			this.root.appendChild(this.cursorPin)
		}

		this.cursorPin.style.left = `${event.clientX}px`
		this.cursorPin.style.top = `${event.clientY}px`
	}

	removeCursorPin() {
		if (!this.cursorPin) return
		this.cursorPin.remove()
		this.cursorPin = undefined
	}

	applyOverlayScale() {
		if (!this.host) return

		this.host.style.setProperty("--prismic-overlay-ui-scale", String(this.uiScale))
		this.renderPinPositions()
		this.reportSelectedPinPositionSoon()
	}

	handleDocumentClick() {
		if (this.commentState.placementEnabled) return

		const pin = selectedPinIdentity(this.commentState)
		if (!pin) return

		this.post({ type: deselectPinMessageType, pin })
	}

	scrollSelectedPinIntoView() {
		if (!this.pins || !this.scrollToThreadId) return

		const pinState = this.commentState.pins.find(
			(candidate) => candidate.threadId === this.scrollToThreadId,
		)
		const pin = Array.from(this.pins.querySelectorAll<HTMLButtonElement>(".pin")).find(
			(candidate) => candidate.dataset.threadId === this.scrollToThreadId,
		)
		if (!pin || !pinState) return

		this.scrollToThreadId = undefined
		if (isFullyVisible(pin)) {
			this.reportSelectedPinPositionSoon()
			return
		}

		const { width, height } = measureDocument()
		window.scrollTo({
			top: Math.max(0, pinState.yRatio * height - window.innerHeight / 2),
			left: Math.max(0, pinState.xRatio * width - window.innerWidth / 2),
			behavior: "smooth",
		})
	}

	reportSelectedPinPosition() {
		const pin = this.getSelectedPin()
		if (!pin) return

		const message: OverlayEvent = {
			type: reportSelectedPinPositionMessageType,
			pin:
				pin.dataset.pinType === "thread" && pin.dataset.threadId
					? { type: "thread", threadId: pin.dataset.threadId }
					: { type: "draft" },
			rect: getPinRect(pin),
			visible: isVisible(pin),
		}
		const serializedMessage = JSON.stringify(message)
		if (serializedMessage === this.lastPositionMessage) return

		this.lastPositionMessage = serializedMessage
		this.post(message)
	}

	getSelectedPin() {
		if (!this.pins) return undefined

		if (this.commentState.draftPin) {
			return this.pins.querySelector<HTMLButtonElement>('[data-pin-type="draft"]')
		}

		if (!this.commentState.selectedThreadId) return undefined
		return Array.from(
			this.pins.querySelectorAll<HTMLButtonElement>('[data-pin-type="thread"]'),
		).find((pin) => pin.dataset.threadId === this.commentState.selectedThreadId)
	}

	post(message: OverlayEvent) {
		window.parent.postMessage(message, this.parentOrigin)
	}
}

function emptyCommentOverlayState(): CommentOverlayState {
	return {
		placementEnabled: false,
		pins: [],
		draftAuthor: undefined,
		selectedThreadId: undefined,
		draftPin: undefined,
	}
}

function normalizeCommentOverlayState(data: CommentOverlayState) {
	return {
		placementEnabled: data.placementEnabled,
		pins: data.pins,
		draftAuthor: data.draftAuthor,
		selectedThreadId: data.selectedThreadId,
		draftPin: data.draftPin,
	}
}

function selectedPinKey(state: CommentOverlayState) {
	if (state.draftPin) return "draft"
	return state.selectedThreadId
}

function selectedPinIdentity(state: CommentOverlayState): PinIdentity | undefined {
	if (state.draftPin) return { type: "draft" }
	if (!state.selectedThreadId) return
	return { type: "thread", threadId: state.selectedThreadId }
}

function createPinContent(author: Author) {
	const avatar = document.createElement("span")
	avatar.className = "pin-avatar"

	if (author.avatarUrl) {
		const image = document.createElement("img")
		image.className = "pin-avatar-image"
		image.src = author.avatarUrl
		image.alt = ""
		image.addEventListener(
			"error",
			() => {
				image.remove()
				avatar.appendChild(createAvatarFallback(author))
			},
			{ once: true },
		)
		avatar.appendChild(image)
	} else {
		avatar.appendChild(createAvatarFallback(author))
	}

	return avatar
}

function createAvatarFallback(author: Author) {
	const fallback = document.createElement("span")
	fallback.className = "pin-avatar-fallback"
	fallback.textContent = getInitials(author.name || author.id)
	return fallback
}

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/)
	return [parts[0], parts[parts.length - 1]]
		.filter((part, index) => part && (index === 0 || parts.length > 1))
		.map((part) => part.charAt(0).toLocaleUpperCase())
		.join("")
}

function positionPin(pin: HTMLElement, position: Positioned, uiScale: number, host: HTMLElement) {
	const { left, top } = getPinDocumentPosition(position, uiScale)
	const hostRect = host.getBoundingClientRect()
	const hostDocumentLeft = hostRect.left + window.scrollX
	const hostDocumentTop = hostRect.top + window.scrollY
	pin.style.left = `${left - hostDocumentLeft}px`
	pin.style.top = `${top - hostDocumentTop}px`
}

export function getPinDocumentPosition(position: Positioned, uiScale: number) {
	const { width, height } = measureDocument()
	const renderedPinSize = pinSize() * uiScale
	const maxLeft = Math.max(boundaryPadding, width - renderedPinSize - boundaryPadding)
	const maxTop = Math.max(boundaryPadding, height - renderedPinSize - boundaryPadding)

	return {
		left: clamp(position.xRatio * width, boundaryPadding, maxLeft),
		top: clamp(position.yRatio * height, boundaryPadding, maxTop),
	}
}

// Lets a pin be measured before it is rendered, so placing a comment can report
// the draft pin's rectangle without waiting for a round trip through the Editor.
export function getPinRectFromPosition(position: Positioned, uiScale: number) {
	const { left, top } = getPinDocumentPosition(position, uiScale)
	const renderedPinSize = pinSize() * uiScale

	return toPinRect({
		left: left - window.scrollX,
		top: top - window.scrollY,
		width: renderedPinSize,
		height: renderedPinSize,
	})
}

function pinSize() {
	return 32
}

function measureDocument() {
	return {
		width: Math.max(
			document.documentElement.clientWidth,
			document.documentElement.scrollWidth,
			document.body.scrollWidth,
		),
		height: Math.max(
			document.documentElement.clientHeight,
			document.documentElement.scrollHeight,
			document.body.scrollHeight,
		),
	}
}

function isFullyVisible(element: Element) {
	const rect = element.getBoundingClientRect()
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= window.innerHeight &&
		rect.right <= window.innerWidth
	)
}

function isVisible(element: Element) {
	const rect = element.getBoundingClientRect()
	return (
		rect.bottom > 0 &&
		rect.right > 0 &&
		rect.top < window.innerHeight &&
		rect.left < window.innerWidth
	)
}

function getPinRect(element: Element) {
	return toPinRect(element.getBoundingClientRect())
}

function toPinRect(rect: Pick<DOMRect, "left" | "top" | "width" | "height">): PinRect {
	return {
		xRatio: rect.left / window.innerWidth,
		yRatio: rect.top / window.innerHeight,
		widthRatio: rect.width / window.innerWidth,
		heightRatio: rect.height / window.innerHeight,
	}
}

export function clamp(value: number, min = 0, max = 1) {
	return Math.min(Math.max(value, min), max)
}
