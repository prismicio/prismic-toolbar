import html2canvas from 'html2canvas';
import { preview } from './cookies';

export class Preview {
  constructor(messenger) {
    this.messenger = messenger;
  }

  async setup() {
    const { auth, preview, master, preview } = await this.messenger.post('state');

    await start(preview && preview.ref);
    setInterval(this.checkPreviewRef, 3000);

    this.active = preview.ref && preview.ref !== master;
    this.authorized = auth;
    Object.assign(this, preview);
  }

  checkPreviewRef = async () => {
    this.start(await this.messenger.post('checkPreviewRef'));
  };

  // TODO async loader
  start = async ref => {
    if (!ref) return this.end();
    if (ref === preview.ref) return;
    preview.ref = ref;
    reload();
  };

  end = async () => {
    const oldRef = this.ref;
    const { auth, master } = await this.messenger.post('state');

    // Delete
    await messenger.post('closePreview');
    if (auth) preview.ref = master;
    else preview.delete();

    // Reload
    if (oldRef && oldRef !== master) reload();
  };

  // TODO performance
  share = async () => {
    const canvas = await html2canvas(document.body);
    const screenshot = new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.5));
    screenshot.then(s => this.messenger.post('screenshot', s));
    return this.messenger.post('share');
  };
}
