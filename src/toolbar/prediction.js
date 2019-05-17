import { Hooks, wait, getLocation } from '@common';

export class Prediction {
  constructor(client, previewCookie) {
    this.client = client;
    this.cookie = previewCookie;
    this.hooks = new Hooks();
    this.documentHooks = [];
    this.documents = [];
    this.count = 0;
  }

  // Start predictions for this page load
  setup = async () => {
    await this.start();
    this.hooks.on('historyChange', this.start);
  }

  // Start predictions for this URL
  start = async () => {
    // Wait for the frontend (React) app to finish loading requests. Fetch again.
    wait(2).then(this.predict);

    // For initial page load SSR requests (match track -> url) and for quickly getting documents
    const fetch = this.predict();
    await fetch;
  }

  // Fetch predicted documents
  predict = async () => {
    const predictionDocs = await this.client.getPredictionDocs({
      ref: this.cookie.getRefForDomain(),
      url: window.location.pathname,
      tracker: this.cookie.getTracker(),
      location: getLocation()
    });
    this.dispatch(predictionDocs);
  }

  // Dispatch documents to hooks
  dispatch = documents => {
    this.documents = documents;
    window.prismic._predictionDocuments = documents; // Debug
    Object.values(this.documentHooks).forEach(hook => hook(documents)); // Run the hooks
  }

  // Documents hook
  onDocuments = func => {
    const c = this.count += 1; // Create the hook key
    this.documentHooks[c] = func; // Create the hook
    return () => delete this.documentHooks[c]; // Alternative to removeEventListener
  }
}
