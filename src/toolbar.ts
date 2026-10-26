import { registerChunk, type MountToolbarOptions } from "./lib/chunks"
import { appendCSS, shadow } from "./lib/dom"
import { repositoryOrigin } from "./lib/env"
import type { PreviewSession, PreviewSnapshot } from "./lib/preview-session"

import styles from "./toolbar.css?inline"

/** Shows the preview bar while previewing, in a shadow root isolated from the website's styles. */
export function mountToolbar({ session, repositoryHost }: MountToolbarOptions): void {
	const root = shadow({
		id: "prismic-toolbar",
		style: { position: "fixed", zIndex: 2147483647, bottom: 0, left: 0 },
	})
	appendCSS(root, styles)

	let bar: HTMLElement | undefined
	let authenticated: boolean | undefined

	function update(snapshot: PreviewSnapshot) {
		if (!snapshot.preview || snapshot.authenticated !== authenticated) {
			bar?.remove()
			bar = undefined
		}
		if (!snapshot.preview) return

		if (!bar) {
			authenticated = snapshot.authenticated
			// Only visitors known to be logged out cannot share. Others share like forwarding the link
			// they opened.
			const share = authenticated === false ? undefined : session.share
			const exit = $el(
				"button",
				{ class: "exit", type: "button", "aria-label": "Exit preview", title: "Exit preview" },
				$closeIcon(),
			)
			exit.onclick = () => void session.exit()
			const logo = authenticated
				? $el(
						"a",
						{
							class: "logo",
							href: `${repositoryOrigin(repositoryHost)}/`,
							target: "_blank",
							rel: "noopener noreferrer",
							"aria-label": "Open the repository in Prismic",
							title: "Open the repository in Prismic",
						},
						$prismicLogo(),
					)
				: $el("span", { class: "logo" }, $prismicLogo())
			const powered = $el(
				"a",
				{
					class: "powered",
					href: "https://prismic.io",
					target: "_blank",
					rel: "noopener noreferrer",
				},
				"Powered by Prismic",
			)
			bar = $el(
				"section",
				{ class: "bar", "aria-label": "Prismic preview" },
				logo,
				$el(
					"div",
					{ class: "details" },
					$el("p", { class: "title" }),
					$el("p", { class: "status" }),
				),
				!share && powered,
				$el("div", { class: "actions" }, share && $shareButton(share), exit),
			)
			// Before the styles, where earlier versions rendered it.
			root.prepend(bar)
		}

		// Only changed text is replaced, so updates keep the visitor's text selection.
		const title = bar.querySelector<HTMLElement>(".title")!
		const text = snapshot.preview.title || "Preview"
		if (title.textContent !== text) title.textContent = title.title = text
		const status = bar.querySelector(".status")!
		const label = snapshot.status === "reloading" ? "Updating…" : "Live preview"
		if (status.textContent !== label) status.textContent = label
	}

	update(session.getSnapshot())
	session.subscribe(update)
}

registerChunk("mountToolbar", mountToolbar)

// Loading shows a spinner.
const shareLabels = { idle: "Share", loading: "", copied: "Copied", failed: "Failed" }

function $shareButton(share: NonNullable<PreviewSession["share"]>): HTMLButtonElement {
	// Every label takes space, so the button keeps its width when its label changes.
	const labels = Object.entries(shareLabels).map(([kind, label]) => {
		const spinner = $el("span", { class: "spinner", role: "img", "aria-label": "Getting link…" })
		return [kind, $el("span", {}, label || spinner)] as const
	})
	const button = $el(
		"button",
		{ class: "share", type: "button", "aria-live": "polite" },
		...labels.map(([, span]) => span),
	)
	let timer: ReturnType<typeof setTimeout> | undefined

	function show(state: keyof typeof shareLabels) {
		clearTimeout(timer)
		button.disabled = state === "loading"
		for (const [kind, span] of labels) {
			span.className = kind === state ? `label-${kind}` : `label-${kind} inactive`
		}
		if (state === "copied" || state === "failed") timer = setTimeout(() => show("idle"), 2000)
	}

	button.onclick = async () => {
		show("loading")
		let url: string
		try {
			url = await share()
		} catch {
			return show("failed")
		}

		try {
			await navigator.clipboard.writeText(url)
			return show("copied")
		} catch {
			// Copying can fail once the click is too old; show the link to copy by hand instead.
		}
		const input = $el("input", {
			class: "share-url",
			type: "text",
			readonly: "",
			"aria-label": "Share link",
		})
		input.value = url
		input.onfocus = () => input.select()
		button.replaceWith(input)
		input.select()
	}

	show("idle")
	return button
}

function $el<Tag extends keyof HTMLElementTagNameMap>(
	tag: Tag,
	attributes: Record<string, string>,
	...children: (Node | string | false | undefined)[]
): HTMLElementTagNameMap[Tag] {
	const element = document.createElement(tag)
	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
	for (const child of children) if (child) element.append(child)
	return element
}

const svgNS = "http://www.w3.org/2000/svg"

// Built with DOM methods: websites enforcing Trusted Types block `innerHTML`.
function $svg(d: string): SVGSVGElement {
	const svg = document.createElementNS(svgNS, "svg")
	svg.setAttribute("width", "18")
	svg.setAttribute("height", "18")
	svg.setAttribute("viewBox", "0 0 24 24")
	svg.setAttribute("aria-hidden", "true")
	svg.setAttribute("focusable", "false")
	const path = document.createElementNS(svgNS, "path")
	path.setAttribute("fill", "currentColor")
	path.setAttribute("d", d)
	svg.append(path)
	return svg
}

const $prismicLogo = () =>
	$svg(
		"M7.6916556,0 L12,0 L9.6,2.4 L7.78415892,2.4 C5.91196957,2.4 5.23306847,2.59493378 4.54862402,2.96097868 C3.86417958,3.32702357 3.32702357,3.86417958 2.96097868,4.54862402 C2.59493378,5.23306847 2.4,5.91196957 2.4,7.78415892 L2.4,12.6 L1.74286712e-13,10.2 L1.56319402e-13,7.6916556 C1.50053155e-13,5.01709938 0.278476833,4.04724067 0.801398111,3.06946289 C1.32431939,2.09168511 2.09168511,1.32431939 3.06946289,0.801398111 C4.04724067,0.278476833 5.01709938,5.24227424e-15 7.6916556,0 Z M7.4458278,3.6 L8.4,3.6 L6.78862794,5.21137206 C6.45998267,5.54001733 6.35819803,5.66560139 6.26123699,5.82064275 C6.16427595,5.9756841 6.0989667,6.13335457 6.05789771,6.31154718 C6.01682873,6.48973978 6,6.65051374 6,7.11528833 L6,16.2 L3.6,13.8 L3.6,7.4458278 C3.6,6.10854969 3.73923842,5.62362033 4.00069906,5.13473144 C4.26215969,4.64584256 4.64584256,4.26215969 5.13473144,4.00069906 C5.62362033,3.73923842 6.10854969,3.6 7.4458278,3.6 Z M24,7.6916556 L24,12 L21.6,9.6 L21.6,7.78415892 C21.6,5.91196957 21.4050662,5.23306847 21.0390213,4.54862402 C20.6729764,3.86417958 20.1358204,3.32702357 19.451376,2.96097868 C18.7669315,2.59493378 18.0880304,2.4 16.2158411,2.4 L11.4,2.4 L13.8,7.94052132e-14 L16.3083444,6.1284311e-14 C18.9829006,5.48542952e-14 19.9527593,0.278476833 20.9305371,0.801398111 C21.9083149,1.32431939 22.6756806,2.09168511 23.1986019,3.06946289 C23.7215232,4.04724067 24,5.01709938 24,7.6916556 Z M20.4,7.4458278 L20.4,8.4 L18.7886279,6.78862794 C18.4599827,6.45998267 18.3343986,6.35819803 18.1793573,6.26123699 C18.0243159,6.16427595 17.8666454,6.0989667 17.6884528,6.05789771 C17.5102602,6.01682873 17.3494863,6 16.8847117,6 L7.8,6 L10.2,3.6 L16.5541722,3.6 C17.8914503,3.6 18.3763797,3.73923842 18.8652686,4.00069906 C19.3541574,4.26215969 19.7378403,4.64584256 19.9993009,5.13473144 C20.2607616,5.62362033 20.4,6.10854969 20.4,7.4458278 Z M16.3083444,24 L12,24 L14.4,21.6 L16.2158411,21.6 C18.0880304,21.6 18.7669315,21.4050662 19.451376,21.0390213 C20.1358204,20.6729764 20.6729764,20.1358204 21.0390213,19.451376 C21.4050662,18.7669315 21.6,18.0880304 21.6,16.2158411 L21.6,11.4 L24,13.8 L24,16.3083444 C24,18.9829006 23.7215232,19.9527593 23.1986019,20.9305371 C22.6756806,21.9083149 21.9083149,22.6756806 20.9305371,23.1986019 C19.9527593,23.7215232 18.9829006,24 16.3083444,24 Z M16.5541722,20.4 L15.6,20.4 L17.2113721,18.7886279 C17.5400173,18.4599827 17.641802,18.3343986 17.738763,18.1793573 C17.8357241,18.0243159 17.9010333,17.8666454 17.9421023,17.6884528 C17.9831713,17.5102602 18,17.3494863 18,16.8847117 L18,7.8 L20.4,10.2 L20.4,16.5541722 C20.4,17.8914503 20.2607616,18.3763797 19.9993009,18.8652686 C19.7378403,19.3541574 19.3541574,19.7378403 18.8652686,19.9993009 C18.3763797,20.2607616 17.8914503,20.4 16.5541722,20.4 Z M0,16.3083444 L0,12 L2.4,14.4 L2.4,16.2158411 C2.4,18.0880304 2.59493378,18.7669315 2.96097868,19.451376 C3.32702357,20.1358204 3.86417958,20.6729764 4.54862402,21.0390213 C5.23306847,21.4050662 5.91196957,21.6 7.78415892,21.6 L12.6,21.6 L10.2,24 L7.6916556,24 C5.01709938,24 4.04724067,23.7215232 3.06946289,23.1986019 C2.09168511,22.6756806 1.32431939,21.9083149 0.801398111,20.9305371 C0.278476833,19.9527593 5.73358225e-15,18.9829006 0,16.3083444 Z M3.6,16.5541722 L3.6,15.6 L5.21137206,17.2113721 C5.54001733,17.5400173 5.66560139,17.641802 5.82064275,17.738763 C5.9756841,17.8357241 6.13335457,17.9010333 6.31154718,17.9421023 C6.48973978,17.9831713 6.65051374,18 7.11528833,18 L16.2,18 L13.8,20.4 L7.4458278,20.4 C6.10854969,20.4 5.62362033,20.2607616 5.13473144,19.9993009 C4.64584256,19.7378403 4.26215969,19.3541574 4.00069906,18.8652686 C3.73923842,18.3763797 3.6,17.8914503 3.6,16.5541722 Z",
	)

const $closeIcon = () =>
	$svg(
		"M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
	)
