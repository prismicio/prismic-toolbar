import { Hooks, getLocation, wait } from '@common';

export class Prediction {
  constructor(repoName, client, previewCookie) {
    this.repoName = repoName;
    this.client = client;
    this.cookie = previewCookie;
    this.hooks = new Hooks();
    this.documentHooks = [];
    this.documentLoadingHooks = [];
    this.count = 0;
    this.retry = 0;
    this.apiEndPoint = this.buildApiEndpoint();
  }

  buildApiEndpoint = () /* String */ => {
    const protocol = this.client.hostname.includes('.test') ? 'http' : 'https';
    return protocol + '://' + this.client.hostname;
  }

  // Set event listener
  setup = async () => {
    const currentTracker = this.cookie.getTracker();
    this.hooks.on('historyChange', () => this.start());
    await this.start(currentTracker);
  }

  // Start predictions for this URL
  start = async maybeTracker => {
    // wait for all requests to be played first (client side)
    this.dispatchLoading();
    await wait(2);
    // load prediction
    const tracker = maybeTracker || this.cookie.getTracker();
    await this.predict(tracker);
    this.cookie.refreshTracker();
  }

  // Fetch predicted documents
  predict = tracker => (
    new Promise(async resolve => {
      const documentsSorted = await this.client.getPredictionDocs({
        ref: this.cookie.getRefForDomain(this.repoName),
        url: window.location.pathname,
        tracker,
        location: getLocation()
      });
      const queriesResults = await this.client.getDevModeQueriesResults({ tracker });
      this.dispatch(documentsSorted, queriesResults);
      resolve();
    })
  )

  retryPrediction = () => {
    const nextRetryMs = this.retry * 1000; // 1s / 2s / 3s
    setTimeout(this.predict, nextRetryMs);
  }

  // Dispatch documents to hooks
  dispatch = (documents, queries) => {
    Object.values(this.documentHooks).forEach(hook => hook(documents, queries)); // Run the hooks
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
