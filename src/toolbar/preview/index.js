import { getLocation } from '@common';
import { reloadOrigin } from '../utils';
import screenshot from './screenshot';

export class Preview {
  constructor(client, previewCookie, previewState) {
    this.cookie = previewCookie;
    this.client = client;
    this.shouldReload = false;
    this.state = previewState;
  }

  // Run once on page load to start or end preview
  setup = async () => {
    const preview = this.state.preview || {};
    this.active = Boolean(preview.ref);
    this.ref = preview.ref;
    this.title = preview.title;
    this.updated = preview.updated;
    this.documents = preview.documents || [];

    // Start or end preview
    await this.start(this.ref);
    this.watchPreviewUpdates();
  };

  watchPreviewUpdates() {
    if (this.active) {
      setInterval(async () => this.updatePreview.bind(this));
    }
  }

  cancelPreviewUpdates() {
    clearInterval(this.updatePreview.bind(this));
  }

  async updatePreview() {
    const updatedRef = await this.client.updatePreview();
    this.start(updatedRef);
  }

  // Start preview
  async start(ref) {
    if (!ref) return this.end();
    if (ref === this.cookie.getRefForDomain()) return;
    this.cookie.upsertPreviewForDomain(ref);
    reloadOrigin();
    this.shouldReload = true;
  }

  // End preview
  async end() {
    const old = this.cookie.preview;
    if (!old) return;
    await this.client.deletePreviewSession();
    this.cookie.deletePreviewForDomain();
    this.cancelPreviewUpdates();
    reloadOrigin();
    this.shouldReload = true;
  }

  async share() {
    const screenBlob = await screenshot();
    this.client.sharePreview(getLocation(), screenBlob);
  }
}
