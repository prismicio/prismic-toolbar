import { toolbarEvents, dispatchToolbarEvent, getLocation } from '@common';
import { reloadOrigin } from '../utils';
import screenshot from './screenshot';

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
    // Start polling only when the cookie already matches; otherwise sync + reload will.
    if (this.active && refUpToDate) this.watchPreviewUpdates();

    return {
      isActive: this.active,
      initialRef: preview.ref,
    };
  };

  watchPreviewUpdates() {
    if (this.active) {
      this.interval = setInterval(() => {
        // End only on a falsy ping ref (via start → end), not a missing site cookie.
        if (document.visibilityState === 'visible') this.updatePreview();
      }, 3000);
    }
  }

  cancelPreviewUpdates() {
    if (this.interval) clearInterval(this.interval);
  }

  async updatePreview() {
    const { reload, ref } = await this.client.updatePreview();
    this.start(ref);
    if (reload) this.reloadPreview(ref);
  }

  async updateFromRef(ref) {
    const { shouldReload } = await this.start(ref);

    if (shouldReload) this.reloadPreview(ref);
  }

  // Reload on the ref we are already previewing. Used when the content behind a
  // stable ref changed, which `updateFromRef` cannot detect. No-op when no preview
  // cookie is set, so a stray message cannot reload a page that isn't previewing.
  reloadEmbeddedPreview() {
    const ref = this.cookie.getRefForDomain();

    if (ref) this.reloadPreview(ref);
  }

  reloadPreview(ref) {
    // Dispatch the update event and hard reload if not cancelled by handlers
    if (dispatchToolbarEvent(toolbarEvents.previewUpdate, { ref })) {
      this.cancelPreviewUpdates();
      reloadOrigin();
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
