import { random, Hooks, localStorage } from 'common';
import { preview as previewCookie } from './cookies';

// Cross-tab tracker status
const globalCurrentState = localStorage('mlke4a29');
const globalTracking = localStorage('lkjtwrh8');

// Preview cookie helpers
const setupBreaker = () => setInterval(() => (previewCookie.breaker = random(8)), 100);
const resetUrl = delay => {
  if (delay > 0) setTimeout(() => (previewCookie.url = null), delay);
  else previewCookie.url = null;
};

// Tracker
export class Tracker {
  constructor(messenger) {
    // Assign
    this.messenger = messenger;
    this.hooks = new Hooks();

    // Quick track
    this.track();

    // Track
    this.messenger.post('state').then(state => {
      globalCurrentState.set(state); // Global state
      this.track(); // Track
    });

    // Takeover track
    if (globalTracking.get()) setInterval(this.track.bind(this), 2000);

    // Handle unload
    window.addEventListener('unload', this.cleanup.bind(this));
  }

  // Cross-tab track
  track() {
    if (globalTracking.get()) return;

    let { auth } = globalCurrentState.get();

    // First auth before messenger
    if (auth == null) return previewCookie.track && this.setup();

    // Normal
    auth ? this.setup() : this.cleanup();
  }

  setup() {
    globalTracking.set(true);

    // Update track
    previewCookie.track = random(8); // TODO breaks prediction.js endpoint call

    // Update breaker
    if (!this.breaker) this.breaker = setupBreaker();

    // Update url
    this.hooks.on('keydown', resetUrl);
    this.hooks.on('beforeRequest', () => {
      clearTimeout(this.clearUrl);
      this.clearUrl = resetUrl(300);
      previewCookie.url = window.location.pathname;
    });
  }

  cleanup() {
    globalTracking.set(false);

    // Reset
    this.hooks.off();
    clearInterval(this.breaker);

    // Cookie
    resetUrl();
    const state = globalCurrentState.get();
    if (state.auth && state.preview) return;
    if (state.auth) return (previewCookie.ref = state.master);
    if (state.preview) return previewCookie.removeQuery();
    return previewCookie.delete();
  }
}
