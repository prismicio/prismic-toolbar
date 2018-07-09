import { Hooks, fetchy } from 'common';
import { preview } from './preview';
import { baseURL } from './config';

export class Prediction {
  constructor(messenger) {
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.auth = Boolean(this.get().ref);
  }

  // State

  setState(state) {
    Object.assign(this, state);
  }

  // Auth

  get auth() {
    return this._auth || Boolean(preview.get().ref);
  }

  set auth(value) {
    this._auth = Boolean(value);
    clearInterval(this.breakerTimer);

    if (value) {
      this.track = random(8);
      this.breakerTimer = setInterval(_ => (this.breaker = random(8)), 100);
      this.hooks.on('beforeRequest', _ => (this.url = window.location.pathname));
      this.hooks.on('afterRequest', _ => (this.url = null));
      this.documents = this.messenger.post('documents', {
        url: window.location.pathname,
        track: preview.track,
      });
    } else {
      this.hooks.off();
      this.fixCookie();
      this.documents = Promise.resolve([]);
    }
  }
}
