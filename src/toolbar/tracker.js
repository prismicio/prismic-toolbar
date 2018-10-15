import { random, Hooks } from 'common';
import { PreviewCookie } from './cookies';

// Tracker
export class Tracker {
  constructor(messenger, domain) {
    // Assign
    this.cookie = new PreviewCookie(domain);
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.auth = Boolean(PreviewCookie.track);

    // Quick track
    this.track();

    // Track
    this.messenger.post('state').then(state => {
      this.auth = state.auth;
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

    // Update track once per page
    PreviewCookie.track = random(8);

    // Hooks for updating url
    this.hooks.on('keydown', () => (this.cookie.url = null));
    this.hooks.on('beforeRequest', () => {
      clearTimeout(this.clearUrl);
      this.cookie.url = window.location.pathname;
      this.clearUrl = setTimeout(() => (this.cookie.url = null), 300);
    });
  }

  cleanup() {
    // Switch
    if (this.tracking === false) return;
    this.tracking = false;

    // Reset
    this.hooks.off();
    PreviewCookie.track = null;
    PreviewCookie.url = null;
  }
}
