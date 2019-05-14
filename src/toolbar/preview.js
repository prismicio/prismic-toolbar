import { getLocation } from '@common';
import { PreviewCookie } from './cookies';
import { reloadOrigin } from './utils';

export class Preview {
  constructor(client) {
    this.cookie = new PreviewCookie(client.hostname);
    this.client = client;
    this.shouldReload = false;
  }

  // Run once on page load to start or end preview
  setup = async () => {
    // Get state
    const preview = (await this.client.post('preview')) || {};

    // Assign state
    this.active = Boolean(preview.ref);
    this.ref = preview.ref || null;
    this.title = preview.title || null;
    this.updated = preview.updated || null;
    this.documents = preview.documents || [];

    // Start or end preview
    await this.start(this.ref);

    // Update on new preview ref
    // update every 3s
    if (this.active) this.client.post('newPreviewRef').then(this.start);
  };

  // Start preview
  start = async ref => {
    if (!ref) return this.end();
    if (ref === this.cookie.preview) return;
    //  this.cookie.preview = ref;
    reloadOrigin();
    this.shouldReload = true;
  };

  // End preview
  end = async () => {
    const old = this.cookie.preview;
    await this.client.post('closePreview');
    this.cookie.preview = null;
    if (!old) return;
    reloadOrigin();
    this.shouldReload = true;
  };

  // Start sharing preview
  share = () => {
    //make the screenshot and send it to share preview
    this.client.post('sharePreview', getLocation());
  }
}
