const sliceStartPrefix = "prismic-slice-start:"
const sliceEndPrefix = "prismic-slice-end:"

export interface SliceMarkerRange {
	sliceId: string
	elements: Element[]
}

export interface SliceRect {
	top: number
	left: number
	width: number
	height: number
}

export interface Slice extends SliceMarkerRange {
	/** Bounds in document coordinates. */
	rect: SliceRect | undefined
}

interface OpenSliceMarker {
	sliceId: string
	start: Comment
}

export function findSliceMarkerRanges(root: Node): SliceMarkerRange[] {
	const ranges: SliceMarkerRange[] = []
	const openMarkers: OpenSliceMarker[] = []
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT)

	while (walker.nextNode()) {
		const node = walker.currentNode
		if (!(node instanceof Comment)) continue

		const startSliceId = getMarkerSliceId(node.data, sliceStartPrefix)
		if (startSliceId) {
			openMarkers.push({
				sliceId: startSliceId,
				start: node,
			})
			continue
		}

		const endSliceId = getMarkerSliceId(node.data, sliceEndPrefix)
		if (!endSliceId) continue

		const startIndex = findOpenMarkerIndex(openMarkers, endSliceId)
		if (startIndex === -1) continue

		const [startMarker] = openMarkers.splice(startIndex, 1)
		if (!startMarker) continue

		ranges.push({
			sliceId: endSliceId,
			elements: getElementsBetween(startMarker.start, node),
		})
	}

	// Inner markers close first, so overlapping roots prefer the innermost slice.
	return ranges
}

export function measureSliceMarkerRange(range: SliceMarkerRange): SliceRect | undefined {
	let top = Number.POSITIVE_INFINITY
	let left = Number.POSITIVE_INFINITY
	let right = Number.NEGATIVE_INFINITY
	let bottom = Number.NEGATIVE_INFINITY

	for (const element of range.elements) {
		const rect = element.getBoundingClientRect()
		if (rect.width === 0 && rect.height === 0) continue

		top = Math.min(top, rect.top)
		left = Math.min(left, rect.left)
		right = Math.max(right, rect.right)
		bottom = Math.max(bottom, rect.bottom)
	}

	if (![top, left, right, bottom].every(Number.isFinite)) return

	// Convert viewport coordinates to document coordinates
	return {
		top: top + window.scrollY,
		left: left + window.scrollX,
		width: right - left,
		height: bottom - top,
	}
}

export function findSliceAtElement<T extends SliceMarkerRange>(
	slices: T[],
	target: Element | null,
): T | undefined {
	let element = target
	while (element) {
		for (const slice of slices) {
			if (slice.elements.includes(element)) return slice
		}
		element = element.parentElement
	}
	return undefined
}

function getMarkerSliceId(value: string, prefix: string) {
	if (!value.startsWith(prefix)) return

	const sliceId = value.slice(prefix.length)
	return sliceId || undefined
}

function findOpenMarkerIndex(markers: OpenSliceMarker[], sliceId: string) {
	for (let index = markers.length - 1; index >= 0; index -= 1) {
		if (markers[index]?.sliceId === sliceId) return index
	}
	return -1
}

function getElementsBetween(start: Comment, end: Comment) {
	if (start.parentNode !== end.parentNode) return []

	const elements: Element[] = []
	let node = start.nextSibling

	while (node && node !== end) {
		if (node instanceof Element) elements.push(node)
		node = node.nextSibling
	}

	return node === end ? elements : []
}
