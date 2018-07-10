import { Hooks, random } from 'common';
import { preview } from './cookies';

export class Prediction {
  constructor(messenger) {
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.active = preview.ref;
  }

  // Documents

  getDocuments() {
    if (this.active)
      this.documents = this.messenger.post('documents', {
        url: window.location.pathname,
        track: preview.track,
      });
    else this.documents = Promise.resolve([]);
    return this.documents;
  }

  // Activate

  get active() {
    return Boolean(this._active);
  }

  set active(beActive) {
    if (Boolean(beActive) === this._active) return;
    this._active = beActive;

    // Setup
    if (beActive) {
      this.track = random(8);
      this.breakerTimer = setInterval(() => (preview.breaker = random(8)), 100);
      this.hooks.on('beforeRequest', () => (preview.url = window.location.pathname));
      this.hooks.on('afterRequest', () => (preview.url = null));
    }

    // Teardown
    else {
      clearInterval(this.breakerTimer);
      this.hooks.off();
    }
  }
}
