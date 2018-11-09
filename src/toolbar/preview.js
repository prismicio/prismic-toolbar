import { getLocation } from 'common';
import { PreviewCookie } from './cookies';
import { reloadOrigin } from './config';

export class Preview {
  constructor(messenger) {
    this.cookie = new PreviewCookie(messenger.hostname);
    this.messenger = messenger;
    this.shouldReload = false;
  }

  setup = async _ => {
    // Get state
    const preview = (await this.messenger.post('preview')) || {};

    // Assign state
    this.active = Boolean(preview.ref);
    this.ref = preview.ref;
    this.title = preview.title;
    this.updated = preview.updated;
    this.documents = preview.documents

    // Start or end preview
    await this.start(this.ref);

    // Update on new preview ref
    if (this.active) this.messenger.post('newPreviewRef').then(this.start);
  };

  // Start preview (TODO static visualLoader.html onClick previewEye, same with shareable)
  start = async ref => {
    if (!ref) return this.end();
    if (ref === this.cookie.preview) return;
    this.cookie.preview = ref;
    reloadOrigin();
    this.shouldReload = true;
  };

  // End preview
  end = async _ => {
    const old = this.cookie.preview;
    await this.messenger.post('closePreview');
    this.cookie.preview = null;
    if (old) {
      reloadOrigin();
      this.shouldReload = true;
    }
  };

  // Start sharing preview
  share = _ => this.messenger.post('sharePreview', getLocation());
}
