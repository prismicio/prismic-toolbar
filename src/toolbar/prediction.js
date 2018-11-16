import { Hooks, wait, getLocation } from 'common';
import { PreviewCookie } from './cookies';

// Initial track
let initialTrack = PreviewCookie.track;

export class Prediction {
  constructor(messenger) {
    this.cookie = new PreviewCookie(messenger.hostname);
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.documentHooks = [];
    this.documents = [];
    this.count = 0;
  }

  // Start predictions for this page load
  setup = async _ => {
    const { auth } = await this.messenger.post('state');
    if (!auth) return;
    await this.start();
    this.hooks.on('historyChange', this.start);
  }

  // Start predictions for this URL
  start = async _ => {
    // Wait for the frontend (React) app to finish loading requests. Fetch again.
    wait(2).then(this.predict);

    // For initial page load SSR requests (match track -> url) and for quickly getting documents
    const fetch = this.predict(initialTrack || PreviewCookie.track)
    initialTrack = null;
    await fetch
  }

  // Fetch predicted documents
  predict = async (track = null) => {
    this.dispatch(await this.messenger.post('documents', {
      ref: this.cookie.preview,  // The ref for the version of content to display
      url: window.location.pathname, // The URL for which we need the documents
      track, // Match the prior request to this URL
      location: getLocation(), // Help sort main document
    }));
  }

  // Dispatch documents to hooks
  dispatch = documents => {
    this.documents = documents;
    window.prismic._predictionDocuments = this.documents; // Debug
    Object.values(this.documentHooks).forEach(hook => hook(this.documents)); // Run the hooks
  }

  // Documents hook
  onDocuments = func => {
    const c = this.count++; // Create the hook key
    this.documentHooks[c] = func; // Create the hook
    return _ => delete this.documentHooks[c]; // Alternative to removeEventListener
  }
}
