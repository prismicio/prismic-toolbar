import { Hooks, memoize, wait, getLocation } from 'common';
import { PreviewCookie } from './cookies';

// Initial track
let initialTrack = PreviewCookie.track;

export class Prediction {
  constructor(messenger, repository) {
    this.cookie = new PreviewCookie(repository);
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.documentHooks = [];
    this.count = 0;

    // Memoize fetchDocuments once per URL
    this.fetchDocuments = memoize(this.fetchDocuments.bind(this), () => window.location.href);

    // Fetch
    this.delayedFetch();
    this.hooks.on('historyChange', this.delayedFetch.bind(this));
  }

  // Fetch documents for the current url
  fetchDocuments() {
    // Remember the initial track for the page
    // Otherwise predictions will break if we load URLs too fast
    const t = initialTrack;
    initialTrack = null;

    // Predict!
    return this.messenger.post('documents', {
      ref: this.cookie.preview, // The ref for the version of content to display (TODO or null?)
      url: window.location.pathname, // The URL for which we need the documents
      track: t || PreviewCookie.track, // So we can match the previous request to this URL
      location: getLocation(), // URL helps sort main document
    });
  }

  // Fetch in .5 seconds (enough time for the server to run the API request, TODO retry), dispatch to hooks
  async delayedFetch() {
    await wait(0.5);
    const documents = await this.fetchDocuments();
    window.prismic._predictionDocuments = documents; // Debug
    Object.values(this.documentHooks).forEach(hook => hook(documents)); // Run the hooks
  }

  // Documents hook
  onDocuments(func) {
    const c = this.count++; // Create the hook key
    this.documentHooks[c] = func; // Create the hook
    return () => delete this.documentHooks[c]; // Alternative to removeEventListener
  }
}
