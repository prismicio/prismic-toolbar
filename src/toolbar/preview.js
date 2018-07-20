import html2canvas from 'html2canvas';
import { preview as previewCookie } from './cookies';
import { reloadOrigin } from './config';
import { getLocation } from 'common';

export class Preview {
  constructor(messenger) {
    this.messenger = messenger;
  }

  setup = async () => {
    const { auth, master, preview } = await this.messenger.post('state');

    await this.start(preview && preview.ref);

    this.active = preview && preview.ref !== master;
    this.authorized = auth;
    Object.assign(this, preview);

    if (this.active) this.messenger.post('newPreviewRef').then(this.start);
  };

  // TODO visual loader
  start = async ref => {
    if (!ref) return this.end();
    if (ref === previewCookie.ref) return;
    previewCookie.ref = ref;
    reloadOrigin();
  };

  end = async () => {
    const oldRef = this.ref;
    const { auth, master } = await this.messenger.post('state');
    await this.messenger.post('closePreview');
    // TODO set master ref upon auth page load
    if (auth) previewCookie.ref = master;
    else previewCookie.delete();
    if (oldRef && oldRef !== master) reloadOrigin(); // Reload
  };

  // TODO performance
  share = () => this.messenger.post('share', getLocation());
}
