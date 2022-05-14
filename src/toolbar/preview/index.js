import { toolbarEvents, dispatchToolbarEvent, getLocation } from "@common";
import { reloadOrigin } from "../utils";
import screenshot from "./screenshot";

export class Preview {
	constructor(client, previewCookie, previewState) {
		this.cookie = previewCookie;
		this.client = client;
		this.state = previewState;

		this.end = this.end.bind(this);
		this.share = this.share.bind(this);
	}

	// Run once on page load to start or end preview
	setup = async () => {
		const preview = this.state.preview || {};
		this.active = Boolean(preview.ref);
		this.ref = preview.ref;
		this.title = preview.title;
		this.updated = preview.updated;
		this.documents = preview.documents || [];

		const refUpToDate = preview.ref === this.cookie.getRefForDomain();
		const displayPreview = this.active && refUpToDate;
		// We don't display the preview by default unless the start function says so
		if (displayPreview) {
			this.watchPreviewUpdates();
		}

		return {
			isActive: this.active,
			initialRef: preview.ref,
			upToDate: refUpToDate,
		};
	};

	watchPreviewUpdates() {
		if (this.active) {
			this.interval = setInterval(() => {
				if (document.visibilityState === "visible") {
					if (this.cookie.getRefForDomain()) {
						this.updatePreview();
					} else {
						this.end();
					}
				}
			}, 3000);
		}
	}

	cancelPreviewUpdates() {
		if (this.interval) {
			clearInterval(this.interval);
		}
	}

	async updatePreview() {
		const { reload, ref } = await this.client.updatePreview();
		this.start(ref);
		if (reload) {
			this.cancelPreviewUpdates();

			// Dispatch the update event and hard reload if not cancelled by handlers
			if (dispatchToolbarEvent(toolbarEvents.previewUpdate, { ref })) {
				reloadOrigin();
			}
		}
	}

	// Start preview
	async start(ref) {
		if (!ref) {
			await this.end();

			return { displayPreview: false, shouldReload: false };
		}

		if (ref === this.cookie.getRefForDomain()) {
			return { displayPreview: true, shouldReload: false };
		}

		this.cookie.upsertPreviewForDomain(ref);
		// Force to display the preview
		return { displayPreview: false, shouldReload: true };
	}

	// End preview
	async end() {
		this.cancelPreviewUpdates();
		await this.client.closePreviewSession();
		this.cookie.deletePreviewForDomain();

		// Dispatch the end event and hard reload if not cancelled by handlers
		if (dispatchToolbarEvent(toolbarEvents.previewEnd)) {
			reloadOrigin();
		}
	}

	async share() {
		const screenBlob = await screenshot();

		return this.client.sharePreview(getLocation(), screenBlob);
	}
}
