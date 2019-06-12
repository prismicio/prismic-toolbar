import { getLocation } from '@common';
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

    if (!this.active) {
      this.cookie.setDefault();
    }

    // We don't display the preview by default unless the start function says so
    return await this.start(this.ref) || { displayPreview: false };
  };

  watchPreviewUpdates() {
    if (this.active) {
      this.interval = setInterval(() => this.updatePreview(), 2000);
    }
  }

  cancelPreviewUpdates() {
    clearInterval(this.interval);
  }

  async updatePreview() {
    const { ref } = await this.client.updatePreview();
    this.start(ref);
  }

  // Start preview
  async start(ref) {
    if (!ref) {
      await this.end();
      return;
    }
    if (ref === this.cookie.getRefForDomain()) return { displayPreview: true };
    this.cookie.upsertPreviewForDomain(ref);
    this.watchPreviewUpdates();
    // Force to display the preview
    reloadOrigin();
  }

  // End preview
  async end() {
    this.cancelPreviewUpdates();
    await this.client.closePreviewSession();
    if (!this.cookie.getRefForDomain()) return;
    this.cookie.deletePreviewForDomain();
    // reload to get rid of preview data and display the live version
    reloadOrigin();
  }

  async share() {
    const screenBlob = await screenshot();
    return this.client.sharePreview(getLocation(), screenBlob);
  }
}
