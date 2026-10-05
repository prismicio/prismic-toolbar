import type * as prismic from "@prismicio/client"
import { PrismicRichText, type SliceComponentProps } from "@prismicio/react"
import { Fragment } from "react"

/** Renders any slice from its fields, so the playground works with every repository. */
export function Slice({ slice }: SliceComponentProps<prismic.Slice | prismic.SharedSlice>) {
	return (
		<section className="slice">
			<h2>
				{slice.slice_type} <small>{"variation" in slice && slice.variation}</small>
			</h2>
			<dl>
				{Object.entries(slice.primary).map(([name, value]) => (
					<Fragment key={name}>
						<dt>{name}</dt>
						<dd>
							<Field value={value} />
						</dd>
					</Fragment>
				))}
			</dl>
		</section>
	)
}

function Field({ value }: { value: unknown }) {
	if (Array.isArray(value) && value.length > 0 && value.every(isRichTextNode)) {
		return <PrismicRichText field={value as prismic.RichTextField} />
	}
	if (isImage(value)) return <img src={value.url} alt={value.alt ?? ""} />
	if (["string", "number", "boolean"].includes(typeof value)) return <>{String(value)}</>
	return <pre>{JSON.stringify(value, null, 2)}</pre>
}

function isRichTextNode(value: unknown): boolean {
	return typeof value === "object" && value !== null && "type" in value && "text" in value
}

function isImage(value: unknown): value is { url: string; alt?: string | null } {
	return (
		typeof value === "object" &&
		value !== null &&
		"dimensions" in value &&
		typeof (value as { url?: unknown }).url === "string"
	)
}
