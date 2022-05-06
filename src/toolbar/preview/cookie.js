import { getCookie, setCookie, demolishCookie, isObject } from "@common";
import { random } from "../../common/general";

const PREVIEW_COOKIE_NAME = "io.prismic.preview";

// Preview cookie manager for a specific repository (safe to have multiple instances)
export class PreviewCookie {
	constructor(isAuthenticated, domain) {
		this.isAuthenticated = isAuthenticated;
		this.domain = domain;
	}

	init(ref) {
		const hasConvertCookie = this.makeConvertLegacy();
		if (hasConvertCookie) {
			return { convertedLegacy: true };
		}

		const tracker = (() => {
			const c = this.get();

			return c && c._tracker;
		})();
		const value = this.build({ tracker, preview: ref });
		this.set(value);

		return { convertedLegacy: false };
	}

	makeConvertLegacy() {
		const cookieOpt = getCookie(PREVIEW_COOKIE_NAME);
		if (cookieOpt) {
			const parsedCookie = (() => {
				try {
					return JSON.parse(cookieOpt);
				} catch (e) {
					return null;
				}
			})();
			if (parsedCookie) {
				return false;
			}
			this.convertLegacyCookie(cookieOpt);

			return true;
		}
	}

	get() /* Object | string */ {
		const cookieOpt = getCookie(PREVIEW_COOKIE_NAME);
		if (cookieOpt) {
			const parsedCookie = (() => {
				try {
					return JSON.parse(cookieOpt);
				} catch (e) {
					return null;
				}
			})();
			if (parsedCookie) {
				return parsedCookie;
			}
			const converted = this.convertLegacyCookie(cookieOpt);

			return converted;
		}
	}

	set(value) {
		if (value) {
			setCookie(PREVIEW_COOKIE_NAME, value);
		} else {
			demolishCookie(PREVIEW_COOKIE_NAME);
		}
	}

	build(
		{ preview, tracker } = {
			preview: null,
			tracker: null,
		},
	) {
		const previewBlock = (() => {
			// copy previews and delete the current one before rebuilding it
			if (!preview) {
				return;
			}
			if (isObject(preview)) {
				return preview;
			}

			return { [this.domain]: { preview } };
		})();

		const trackerBlock = (() => {
			if (!this.isAuthenticated) {
				return;
			}
			if (!tracker) {
				return;
			}

			return { _tracker: tracker || this.generateTracker() };
		})();

		if (previewBlock || trackerBlock) {
			return Object.assign({}, trackerBlock || {}, previewBlock || {});
		}
	}

	convertLegacyCookie(legacyCookieValue) {
		const cleanedCookie = this.build({
			tracker: this.generateTracker(),
			preview: legacyCookieValue,
		});
		this.set(cleanedCookie);

		return cleanedCookie;
	}

	generateTracker() {
		return random(8);
	}

	upsertPreviewForDomain(previewRef) {
		const tracker = (() => {
			const c = this.get();

			return c && c._tracker;
		})();
		const updatedCookieValue = this.build({ tracker, preview: previewRef });
		this.set(updatedCookieValue);
	}

	deletePreviewForDomain() {
		const updatedCookieValue = this.build();
		this.set(updatedCookieValue);
	}

	getRefForDomain() {
		const cookie = this.get();
		if (!cookie) {
			return;
		}

		return cookie[this.domain] && cookie[this.domain].preview;
	}

	getTracker() {
		const cookie = this.get();
		if (!cookie) {
			return;
		}

		return cookie._tracker;
	}

	refreshTracker() {
		const ref = this.getRefForDomain();
		const updatedCookie = this.build({
			preview: ref,
			tracker: this.generateTracker(),
		});
		this.set(updatedCookie);
	}
}
