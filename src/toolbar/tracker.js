import { random, Hooks } from 'common';
import { preview as previewCookie } from './cookies';

// Stop URL tracking
const resetUrl = () => (previewCookie.url = null);

// Tracker
export class Tracker {
  constructor(messenger) {
    // Assign
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.auth = Boolean(previewCookie.track);
    this.preview = Boolean(previewCookie.ref && previewCookie.ref.match('^http'));
    this.master = previewCookie.ref

    // Quick track
    this.track();

    // Track
    this.messenger.post('state').then(state => {
      this.auth = state.auth;
      this.preview = Boolean(state.preview);
      this.master = state.master
      this.track();
    });
  }

  // Track
  track() {
    this.auth ? this.setup() : this.cleanup();
  }

  setup() {
    // Switch
    if (this.tracking === true) return;
    this.tracking = true;

    // Update ref / track / breaker
    if (!this.preview) previewCookie.ref = this.master;
    previewCookie.track = random(8);
    this.breaker = setInterval(() => (previewCookie.breaker = random(8)), 100);

    // Update url
    this.hooks.on('keydown', resetUrl);
    this.hooks.on('beforeRequest', () => {
      clearTimeout(this.clearUrl);
      previewCookie.url = window.location.pathname;
      this.clearUrl = setTimeout(resetUrl, 300);
    });
  }

  cleanup() {
    // Switch
    if (this.tracking === false) return;
    this.tracking = false;

    // Reset object
    this.hooks.off();
    clearInterval(this.breaker);

    // Reset cookie
    if (this.preview) previewCookie.removeQuery();
    else previewCookie.delete();
  }
}
