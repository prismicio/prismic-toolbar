"use client"

import type { FormEvent } from "react"

export function RepositoryPicker({ repository }: { repository: string }) {
	function pick(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		const value = new FormData(event.currentTarget).get("repository")?.toString().trim()
		if (!value) return

		// `SameSite=None` lets the editor's cross-site preview iframe read it too.
		document.cookie = `playground-repository=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=none; secure`
		// The toolbar reads its repository once, when it loads.
		location.assign("/")
	}

	return (
		<form className="picker" onSubmit={pick}>
			<label>
				Repository{" "}
				<input
					name="repository"
					defaultValue={repository}
					required
					pattern="[a-zA-Z0-9][\-a-zA-Z0-9]*(\.[\-a-zA-Z0-9]+)*"
					title="A repository name, like prismic-main, or a host, like example.wroom.io"
				/>
			</label>
			<button type="submit">Switch</button>
		</form>
	)
}
