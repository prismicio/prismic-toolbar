import { Hooks, memoize, wait, random } from 'common';
import { preview } from './cookies';

// Initial track
let initialTrack = preview.track;

export class Prediction {
  constructor(messenger) {
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.documentsHooks = [];
    this.count = 0;

    // Memoize
    this.fetchDocuments = memoize(this.fetchDocuments.bind(this), () => window.location.href);

    // Fetch
    this.fetchSoon();
    this.hooks.on('historyChange', this.fetchSoon.bind(this));
  }

  // Fetch documents (for current url)
  fetchDocuments() {
    const t = initialTrack; // First time hack
    initialTrack = null;
    return this.messenger.post('documents', {
      url: window.location.pathname,
      track: t || preview.track,
    });
  }

  // Fetch in .5 seconds, dispatch to hooks
  async fetchSoon() {
    await wait(0.5);
    const documents = await this.fetchDocuments();
    Object.values(this.documentsHooks).forEach(hook => hook(documents));
  }

  // Documents hook
  onDocuments(func) {
    const c = this.count++;
    this.documentsHooks[c] = func;
    return () => delete this.documentsHooks[c];
  }
}
