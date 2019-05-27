import { Hooks, getLocation } from '@common';

const MAX_RETRY = 3;

export class Prediction {
  constructor(client, previewCookie) {
    this.client = client;
    this.cookie = previewCookie;
    this.hooks = new Hooks();
    this.documentHooks = [];
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
    // load prediction
    await this.predict();
    // refresh the tracker for the next time
    this.cookie.refreshTracker();
  }

  // Fetch predicted documents
  predict = async () => {
    const [isPartialContent, predictionDocs] = await this.client.getPredictionDocs({
      ref: this.cookie.getRefForDomain(),
      url: window.location.pathname,
      tracker: this.cookie.getTracker(),
      location: getLocation()
    });

    if (isPartialContent) {
      this.retry = this.retry < MAX_RETRY ? this.retry + 1 : 0;
      if (this.retry) this.retryPrediction();
    }
    this.dispatch(Boolean(this.retry), predictionDocs);
  }

  retryPrediction = () => {
    const nextRetryMs = this.retry * 1000; // 1s / 2s / 3s
    setTimeout(this.predict, nextRetryMs);
  }

  // Dispatch documents to hooks
  dispatch = (retry, documents) => {
    this.documents = documents;
    Object.values(this.documentHooks).forEach(hook => hook(retry, documents)); // Run the hooks
  }

  // Documents hook
  onDocuments = func => {
    const c = this.count += 1; // Create the hook key
    this.documentHooks[c] = func; // Create the hook
    return () => delete this.documentHooks[c]; // Alternative to removeEventListener
  }
}
