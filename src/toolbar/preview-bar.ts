import type { MountToolbarOptions } from "../lib/chunks"
import { repositoryOrigin } from "../lib/env"
import type { PreviewSession, PreviewSnapshot } from "../lib/preview-session"
import { closeIcon, prismicLogo } from "./icons"

/** Shows the preview bar in `root` while the session previews. Returns a function that removes it. */
export function renderPreviewBar(
	root: ParentNode,
	{ session, repositoryHost }: MountToolbarOptions,
): () => void {
	let bar: HTMLElement | undefined
	let authenticated = false

	function update(snapshot: PreviewSnapshot) {
		if (!snapshot.preview || snapshot.authenticated !== authenticated) {
			bar?.remove()
			bar = undefined
		}
		if (!snapshot.preview) return

		if (!bar) {
			authenticated = snapshot.authenticated
			const exit = el(
				"button",
				{ class: "exit", type: "button", "aria-label": "Exit preview", title: "Exit preview" },
				closeIcon(),
			)
			exit.onclick = () => void session.exit()
			const logo = authenticated
				? el(
						"a",
						{
							class: "logo",
							href: `${repositoryOrigin(repositoryHost)}/`,
							target: "_blank",
							rel: "noopener noreferrer",
							"aria-label": "Open the repository in Prismic",
							title: "Open the repository in Prismic",
						},
						prismicLogo(),
					)
				: el("span", { class: "logo" }, prismicLogo())
			const powered = el(
				"a",
				{
					class: "powered",
					href: "https://prismic.io",
					target: "_blank",
					rel: "noopener noreferrer",
				},
				"Powered by Prismic",
			)
			bar = el(
				"section",
				{ class: "bar", "aria-label": "Prismic preview" },
				logo,
				el("div", { class: "details" }, el("p", { class: "title" }), el("p", { class: "status" })),
				!authenticated && powered,
				el("div", { class: "actions" }, authenticated && shareButton(session), exit),
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
	const unsubscribe = session.subscribe(update)
	return () => {
		unsubscribe()
		bar?.remove()
	}
}

// Loading shows a spinner.
const shareLabels = { idle: "Share", loading: "", copied: "Copied", failed: "Failed" }

function shareButton(session: PreviewSession): HTMLButtonElement {
	// Every label takes space, so the button keeps its width when its label changes.
	const labels = Object.entries(shareLabels).map(([kind, label]) => {
		const spinner = el("span", { class: "spinner", role: "img", "aria-label": "Getting link…" })
		return [kind, el("span", {}, label || spinner)] as const
	})
	const button = el(
		"button",
		{ class: "share", type: "button", "aria-live": "polite" },
		...labels.map(([, span]) => span),
	)
	// Share links by page, so copying a link again needs no spinner.
	const links = new Map<string, string>()
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
		const pageURL = window.location.href
		const cached = links.get(pageURL)
		if (!cached) show("loading")
		try {
			const url = cached ?? (await session.share(pageURL))
			links.set(pageURL, url)
			if (await copyText(url)) return show("copied")

			// Copying can fail once the click is too old; show the link to copy by hand instead.
			const input = el("input", {
				class: "share-url",
				type: "text",
				readonly: "",
				"aria-label": "Share link",
			})
			input.value = url
			input.onfocus = () => input.select()
			button.replaceWith(input)
			input.select()
		} catch {
			show("failed")
		}
	}

	show("idle")
	return button
}

function el<Tag extends keyof HTMLElementTagNameMap>(
	tag: Tag,
	attributes: Record<string, string>,
	...children: (Node | string | false)[]
): HTMLElementTagNameMap[Tag] {
	const element = document.createElement(tag)
	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
	for (const child of children) if (child) element.append(child)
	return element
}

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}
