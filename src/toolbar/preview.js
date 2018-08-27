import { getLocation } from 'common';
import { preview as previewCookie } from './cookies';
import { reloadOrigin } from './config';

export class Preview {
  constructor(messenger) {
    this.messenger = messenger;
  }

  setup = async () => {
    // State
    const { auth, master, preview } = await this.messenger.post('state');

    // Start
    await this.start(preview && preview.ref);

    // State
    this.active = preview && preview.ref !== master;
    this.authorized = auth;
    Object.assign(this, preview);

    // Start upon new ref
    if (this.active) this.messenger.post('newPreviewRef').then(this.start);
  };

  // Start preview (TODO static visualLoader.html onClick previewEye, same with shareable)
  start = async ref => {
    if (!ref) return this.end();
    if (ref === previewCookie.ref) return;
    previewCookie.ref = ref;
    reloadOrigin();
  };

  // End preview
  end = async () => {
    const oldRef = this.ref;
    const { auth, master } = await this.messenger.post('state');
    await this.messenger.post('closePreview');
    previewCookie.ref = auth ? master : null
    if (oldRef && oldRef !== master) reloadOrigin(); // Reload
  };

  // Start sharing
  share = () => this.messenger.post('share', getLocation());
}
