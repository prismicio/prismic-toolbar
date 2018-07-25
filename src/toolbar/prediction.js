import { Hooks, memoize, wait } from 'common';
import { preview } from './cookies';

// Initial track
let initialTrack = preview.track;

export class Prediction {
  constructor(messenger) {
    this.messenger = messenger;
    this.hooks = new Hooks();

    // Setup
    this.fetchDocuments = memoize(this.fetchDocuments.bind(this), () => window.location.href);
    this.documents = new Promise(rs => (this.resolveDocuments = rs));

    // Fetch
    this.fetchSoon().then(this.resolveDocuments);
    this.hooks.on('historyChange', () => (this.documents = this.fetchSoon()));
  }

  // Fetch in .5s
  async fetchSoon() {
    await wait(0.5);
    return this.fetchDocuments();
  }

  // Fetch documents for current url
  fetchDocuments() {
    const t = initialTrack; // First time hack
    initialTrack = null;
    return this.messenger.post('documents', {
      url: window.location.pathname,
      track: t || preview.track,
    });
  }
}
