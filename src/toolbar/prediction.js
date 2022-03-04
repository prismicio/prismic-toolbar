import { Hooks, getLocation, wait } from '@common';
import { throttle, getDocumentIDsFromMeta, onPrismicMetaChange, forceDocumentTracking, tamperDocumentsAndQueries } from './metaPrediction';

export class Prediction {
  constructor(client, previewCookie) {
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
  };

  // Set event listener
  setup = async () => {
    const currentTracker = this.cookie.getTracker();

    // Update preduction on history change
    this.hooks.on('historyChange', () => this.start());

    // Update prediction on meta change
    onPrismicMetaChange(throttle(async () => {
      this.dispatchLoading();
      await this.predict(this.cookie.getTracker());
      this.cookie.refreshTracker();
    }, 500));

    // Start prediction
    await this.start(currentTracker);
  };

  // Start predictions for this URL
  start = async maybeTracker => {
    // wait for all requests to be played first (client side)
    this.dispatchLoading();
    // Wait less when using meta tags-based prediction since we'll have to query anyway after,
    // this allow for the edit button to be snappier
    await wait(getDocumentIDsFromMeta(true) ? 1 : 2);

    // load prediction
    const tracker = maybeTracker || this.cookie.getTracker();
    await this.predict(tracker);
    this.cookie.refreshTracker();
  };

  predict = tracker =>
    new Promise(async resolve => {
      let documentsSorted;
      let queriesResults;

      // Force querying documents from meta tags-based prediction
      const docIDs = getDocumentIDsFromMeta();
      if (docIDs) await forceDocumentTracking(docIDs, this.apiEndPoint);

      // Run prediction
      documentsSorted = await this.client.getPredictionDocs({
        ref: this.cookie.getRefForDomain(),
        url: window.location.pathname,
        tracker,
        location: getLocation(),
      });
      queriesResults = (await this.client.getDevModeQueriesResults({
        tracker,
      })).filter(Boolean);

      // Tamper with automatic prediction if user used meta tags-based prediction
      if (docIDs) {
        [documentsSorted, queriesResults] = tamperDocumentsAndQueries(
          docIDs, documentsSorted, queriesResults
        );
      }

      this.dispatch(documentsSorted, queriesResults);
      resolve();
    });

  retryPrediction = () => {
    const nextRetryMs = this.retry * 1000; // 1s / 2s / 3s
    setTimeout(this.predict, nextRetryMs);
  };

  // Dispatch documents to hooks
  dispatch = (documents, queries) => {
    Object.values(this.documentHooks).forEach(hook =>
      hook(documents, queries)
    ); // Run the hooks
  };

  dispatchLoading = () => {
    Object.values(this.documentLoadingHooks).forEach(hook => hook());
  };

  onDocumentsLoading = func => {
    const c = (this.count += 1); // Create the hook key
    this.documentLoadingHooks[c] = func; // Create the hook
    return () => delete this.documentLoadingHooks[c]; // Alternative to removeEventListener
  };

  // Documents hook
  onDocuments = func => {
    const c = (this.count += 1); // Create the hook key
    this.documentHooks[c] = func; // Create the hook
    return () => delete this.documentHooks[c]; // Alternative to removeEventListener
  };
}
