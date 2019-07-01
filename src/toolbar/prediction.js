import { Hooks, getLocation, wait } from '@common';

export class Prediction {
  constructor(client, previewCookie) {
    this.client = client;
    this.cookie = previewCookie;
    this.hooks = new Hooks();
    this.documentHooks = [];
    this.documentLoadingHooks = [];
    this.documents = [];
    this.count = 0;
    this.retry = 0;
  }

  // Start predictions for this page load
  setup = async () => {
    await this.start();
    this.hooks.on('historyChange', this.start);
  }

  // Start predictions for this URL
  start = async () => {
    const currentTracker = this.cookie.getTracker();
    this.cookie.refreshTracker();
    // wait for all requests to be played first (client side)
    this.dispatchLoading();
    await wait(2);
    // load prediction
    await this.predict(currentTracker);
  }

  // Fetch predicted documents
  predict = tracker => (
    new Promise(async resolve => {
      const predictionDocs = await this.client.getPredictionDocs({
        ref: this.cookie.getRefForDomain(),
        url: window.location.pathname,
        tracker,
        location: getLocation()
      });
      this.dispatch(predictionDocs);
      resolve();
    })
  )

  retryPrediction = () => {
    const nextRetryMs = this.retry * 1000; // 1s / 2s / 3s
    setTimeout(this.predict, nextRetryMs);
  }

  // Dispatch documents to hooks
  dispatch = documents => {
    this.documents = documents;
    Object.values(this.documentHooks).forEach(hook => hook(documents)); // Run the hooks
  }

  dispatchLoading = () => {
    Object.values(this.documentLoadingHooks).forEach(hook => hook());
  }

  onDocumentsLoading = func => {
    const c = this.count += 1; // Create the hook key
    this.documentLoadingHooks[c] = func; // Create the hook
    return () => delete this.documentLoadingHooks[c]; // Alternative to removeEventListener
  }

  // Documents hook
  onDocuments = func => {
    const c = this.count += 1; // Create the hook key
    this.documentHooks[c] = func; // Create the hook
    return () => delete this.documentHooks[c]; // Alternative to removeEventListener
  }
}
