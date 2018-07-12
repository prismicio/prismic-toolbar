import { random, Hooks, Promises } from 'common';
import { preview } from './cookies';

export class Prediction {
  constructor(messenger) {
    this.messenger = messenger;

    // Initial fetch
    this.fetchDocuments();

    // Setup preview cookie
    preview.useQuery = true;
    preview.track = random(8);
    setInterval(() => (preview.breaker = random(8)), 100);

    // Setup hooks
    this.hooks = new Hooks();
    this.hooks.on('beforeRequest', () => (preview.url = window.location.pathname));
    this.hooks.on('afterRequest', () => (preview.url = null));
    this.hooks.on('pageChange', () => this.fetchDocuments()); // TODO page change hook
  }

  // Fetch documents for current url
  fetchDocuments() {
    this.documents = this.messenger.post('documents', {
      url: window.location.pathname,
      track: preview.track,
    });
  }
}
