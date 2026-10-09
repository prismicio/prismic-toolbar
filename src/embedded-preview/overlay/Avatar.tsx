import { useState } from "preact/hooks"

interface AvatarProps {
	name: string
	imageUrl?: string
}

export function Avatar(props: AvatarProps) {
	const { name, imageUrl } = props

	const [failedAvatarURL, setFailedAvatarURL] = useState<string>()

	return (
		<span className="avatar">
			{imageUrl && imageUrl !== failedAvatarURL ? (
				<img
					className="avatar-image"
					src={imageUrl}
					alt=""
					onError={() => setFailedAvatarURL(imageUrl)}
				/>
			) : (
				<span className="avatar-fallback">{getInitials(name)}</span>
			)}
		</span>
	)
}

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/)
	return [parts[0], parts[parts.length - 1]]
		.filter((part, index) => part && (index === 0 || parts.length > 1))
		.map((part) => part.charAt(0).toLocaleUpperCase())
		.join("")
}
