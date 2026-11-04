import { useLayoutEffect } from "preact/hooks"

import type { PostMessage } from "../message-protocol"
import { useStableCallback } from "./useStableCallback"

export function useShortcuts(postMessage: PostMessage) {
	const handleKeydown = useStableCallback((event: KeyboardEvent) => {
		if (event.defaultPrevented || isEditable(event.composedPath()[0])) return

		const command = getCommand(event)
		if (!command) return

		event.preventDefault()
		postMessage({ type: `prismic:embedded-preview:${command}` })
	})

	useLayoutEffect(() => {
		document.addEventListener("keydown", handleKeydown)
		return () => document.removeEventListener("keydown", handleKeydown)
	}, [handleKeydown])
}

const isApple = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform)

const shortcuts = {
	undo: isApple ? ["Meta+z"] : ["Control+z"],
	redo: isApple ? ["Meta+Shift+z"] : ["Control+Shift+z", "Control+y"],
}

function getCommand(event: KeyboardEvent) {
	const pressed = getPressedShortcut(event)
	if (shortcuts.undo.includes(pressed)) return "undo"
	if (shortcuts.redo.includes(pressed)) return "redo"
}

/** The pressed keys, written like the shortcuts above: "Meta+Shift+z". */
function getPressedShortcut(event: KeyboardEvent) {
	const modifiers = [
		event.ctrlKey && "Control",
		event.altKey && "Alt",
		event.metaKey && "Meta",
		event.shiftKey && "Shift",
	].filter(Boolean)

	return [...modifiers, event.key.toLowerCase()].join("+")
}

function isEditable(target: EventTarget | undefined) {
	if (!(target instanceof HTMLElement)) return false
	return target.isContentEditable || target.matches("input, textarea, select")
}
