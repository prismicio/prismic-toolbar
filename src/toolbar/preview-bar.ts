import type { MountToolbarOptions } from "../lib/chunks"
import { repositoryOrigin } from "../lib/env"
import type { PreviewSession, PreviewSnapshot } from "../lib/preview-session"
import { closeIcon, prismicLogo } from "./icons"

/**
 * Renders the preview bar in `root` while the session previews, updating it in place with each
 * snapshot. Returns a function that removes it and stops following the session.
 */
export function renderPreviewBar(
	root: ParentNode,
	{ session, repositoryHost }: MountToolbarOptions,
): () => void {
	const title = el("p", { class: "title" })
	const status = el("p", { class: "status" })
	const details = el("div", { class: "details" }, title, status)
	const powered = el(
		"a",
		{ class: "powered", href: "https://prismic.io", target: "_blank", rel: "noopener noreferrer" },
		"Powered by Prismic",
	)
	const exit = el(
		"button",
		{ class: "exit", type: "button", "aria-label": "Exit preview", title: "Exit preview" },
		closeIcon(),
	)
	exit.addEventListener("click", () => void session.exit())
	const actions = el("div", { class: "actions" }, exit)
	const bar = el("section", { class: "bar", "aria-label": "Prismic preview" }, details, actions)

	let authenticated: boolean | undefined
	let logo: Element | undefined
	let share: ShareButton | undefined

	function update(snapshot: PreviewSnapshot) {
		if (!snapshot.preview) {
			bar.remove()
			share?.remove()
			share = authenticated = undefined
			return
		}

		if (snapshot.authenticated !== authenticated) {
			authenticated = snapshot.authenticated
			logo?.remove()
			logo = authenticated
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
			bar.prepend(logo)
			if (authenticated) powered.remove()
			else details.after(powered)
			share?.remove()
			share = authenticated ? createShareButton(session, actions) : undefined
		}

		const text = snapshot.preview.title || "Preview"
		if (title.textContent !== text) title.textContent = title.title = text
		const label = snapshot.status === "reloading" ? "Updating…" : "Live preview"
		if (status.textContent !== label) status.textContent = label

		// Before the styles, where earlier versions rendered it.
		if (!bar.parentNode) root.prepend(bar)
	}

	update(session.getSnapshot())
	const unsubscribe = session.subscribe(update)

	return () => {
		unsubscribe()
		update({ status: "idle", authenticated: false })
	}
}

type ShareButton = { remove(): void }

type ShareState = keyof typeof shareLabels

// Loading shows a spinner.
const shareLabels = {
	idle: "Share",
	loading: "",
	copied: "Copied",
	failed: "Failed",
}

/** Adds a share button at the start of `parent`. */
function createShareButton(session: PreviewSession, parent: Element): ShareButton {
	const button = el("button", { class: "share", type: "button", "aria-live": "polite" })
	// Every label takes space, so the button keeps its width when its label changes.
	const labels = Object.entries(shareLabels).map(([kind, label]) => {
		const spinner = el("span", { class: "spinner", role: "img", "aria-label": "Getting link…" })
		return [kind, el("span", {}, label || spinner)] as const
	})
	button.append(...labels.map(([, span]) => span))
	button.addEventListener("click", () => void share())
	parent.prepend(button)

	let element: Element = button
	let timer: ReturnType<typeof setTimeout> | undefined
	let removed = false
	// Share links by page, so copying a link again needs no spinner.
	const links = new Map<string, string>()

	function setState(state: ShareState) {
		clearTimeout(timer)
		button.disabled = state === "loading"
		for (const [kind, span] of labels) {
			span.className = kind === state ? `label-${kind}` : `label-${kind} inactive`
		}
		if (state === "copied" || state === "failed") timer = setTimeout(() => setState("idle"), 2000)
	}

	function showLink(url: string) {
		clearTimeout(timer)
		const input = el("input", {
			class: "share-url",
			type: "text",
			readonly: "",
			"aria-label": "Share link",
		})
		input.value = url
		input.addEventListener("focus", () => input.select())
		button.replaceWith(input)
		element = input
		input.select()
	}

	async function share() {
		const pageURL = window.location.href
		const cached = links.get(pageURL)
		if (!cached) setState("loading")
		try {
			const url = cached ?? (await session.share(pageURL))
			links.set(pageURL, url)
			// Copying can fail once the click is too old; show the link to copy by hand instead.
			const copied = await copyText(url)
			if (removed) return
			if (copied) setState("copied")
			else showLink(url)
		} catch {
			if (!removed) setState("failed")
		}
	}

	setState("idle")

	return {
		remove() {
			removed = true
			clearTimeout(timer)
			element.remove()
		},
	}
}

function el<Tag extends keyof HTMLElementTagNameMap>(
	tag: Tag,
	attributes: Record<string, string>,
	...children: (Node | string)[]
): HTMLElementTagNameMap[Tag] {
	const element = document.createElement(tag)
	for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
	element.append(...children)
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
