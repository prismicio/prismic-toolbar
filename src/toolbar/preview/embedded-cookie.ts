import { deleteCookie, getCookie, setCookie } from "@common"

const previewCookieName = "io.prismic.preview"

export class EmbeddedPreviewCookie {
	// Align the site cookie with `ref`. Returns true when the page should reload.
	sync(ref: string | undefined) {
		if (ref === this.getRefForDomain()) return false

		if (ref) this.upsertPreviewForDomain(ref)
		else this.deletePreviewForDomain()

		return true
	}

	getRefForDomain() {
		return getCookie(previewCookieName)
	}

	upsertPreviewForDomain(ref: string) {
		setCookie(previewCookieName, ref)
	}

	deletePreviewForDomain() {
		deleteCookie(previewCookieName)
	}
}
