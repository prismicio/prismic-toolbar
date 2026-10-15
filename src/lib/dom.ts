type InlineStyle = Partial<Record<keyof CSSStyleDeclaration, string | number>>
type ShadowAttributes = { style?: InlineStyle } & Record<string, string | number | InlineStyle>

// Wait until the parsed DOM, including document.body, is available.
export const readyDOM = async () => {
	if (!document.body) {
		await new Promise<Event>((resolve) => {
			document.addEventListener("DOMContentLoaded", resolve, { once: true })
		})
	}
	return true
}

// Generate a shadow DOM

export const shadow = (attr: ShadowAttributes): ShadowRoot | HTMLDivElement => {
	const div = document.createElement("div")
	Object.entries(attr).forEach(([key, value]) => {
		if (key === "style") {
			return Object.assign(div.style, value)
		}
		return div.setAttribute(key, String(value))
	})
	const shadowRoot = document.head.attachShadow && div.attachShadow({ mode: "open" })
	document.body.appendChild(div)
	return shadowRoot || div
}

// Append Stylesheet to DOM node
export const appendCSS = (el: Node, css: string) => {
	const style = document.createElement("style")
	style.type = "text/css"
	style.appendChild(document.createTextNode(css))
	el.appendChild(style)
}

const scripts = new Map<string, Promise<void>>()

// Load a classic script once. Toolbar chunks are classic scripts: the CDN sends no CORS headers,
// which module scripts would need.
export const loadScript = (src: string): Promise<void> => {
	let script = scripts.get(src)
	if (!script) {
		script = new Promise<void>((resolve, reject) => {
			const element = document.createElement("script")
			element.src = src
			element.async = true
			element.addEventListener("load", () => resolve(), { once: true })
			element.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
				once: true,
			})
			document.head.appendChild(element)
		})
		script.catch(() => scripts.delete(src))
		scripts.set(src, script)
	}
	return script
}
