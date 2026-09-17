import type { PinRect, Positioned } from "./overlay-messages"

const boundaryPadding = 4
const pinSize = 32

export interface DocumentSize {
	width: number
	height: number
}

export function getPinDocumentPosition(
	position: Positioned,
	uiScale: number,
	{ width, height } = measureDocument(),
) {
	const renderedPinSize = pinSize * uiScale
	const maxLeft = Math.max(boundaryPadding, width - renderedPinSize - boundaryPadding)
	const maxTop = Math.max(boundaryPadding, height - renderedPinSize - boundaryPadding)

	return {
		left: clamp(position.xRatio * width, boundaryPadding, maxLeft),
		top: clamp(position.yRatio * height, boundaryPadding, maxTop),
	}
}

export function getPinRectFromPosition(position: Positioned, uiScale: number) {
	const { left, top } = getPinDocumentPosition(position, uiScale)
	const renderedPinSize = pinSize * uiScale

	return toPinRect({
		left: left - window.scrollX,
		top: top - window.scrollY,
		width: renderedPinSize,
		height: renderedPinSize,
	})
}

export function measureDocument() {
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

export function isFullyVisible(element: Element) {
	const rect = element.getBoundingClientRect()
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= window.innerHeight &&
		rect.right <= window.innerWidth
	)
}

export function isVisible(element: Element) {
	const rect = element.getBoundingClientRect()
	return (
		rect.bottom > 0 &&
		rect.right > 0 &&
		rect.top < window.innerHeight &&
		rect.left < window.innerWidth
	)
}

export function getPinRect(element: Element) {
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
