import { Hooks } from '@babel/preset-stage-2';
import { PreviewCookie } from './preview/cookie';

// One breaker interval per scope (tab but ideally browser)
let breakerInterval;

// Tracker
export class Tracker {
  constructor(client, previewCookie) {
    // Assign
    this.cookie = previewCookie;
    this.client = client;
    this.hooks = new Hooks();
    this.auth = Boolean(PreviewCookie.track);

    this.setup();
  }

  setup() {
    // Switch
    if (this.tracking === true) return;
    this.tracking = true;

    // Update breaker every 150ms
    clearInterval(breakerInterval);
    breakerInterval = setInterval(() => (PreviewCookie.refreshBreaker()), 150);

    // Hooks for updating url
    this.hooks.on('keydown', () => (PreviewCookie.url = null));
    this.hooks.on('unload', () => (PreviewCookie.url = null));
    this.hooks.on('beforeRequest', () => {
      clearTimeout(this.clearUrl);
      PreviewCookie.url = window.location.pathname;
      this.clearUrl = setTimeout(() => (PreviewCookie.url = null), 300);
    });
  }
}
