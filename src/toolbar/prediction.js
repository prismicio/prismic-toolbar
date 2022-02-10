import { Hooks, getLocation, wait } from '@common';
import { createClient, ForbiddenError } from '@prismicio/client';

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
    this.hooks.on('historyChange', () => this.start());
    await this.start(currentTracker);
  };

  // Get main and sub documents IDs from meta
  getDocumentIDsFromMeta = (silent = false) => {
    // Get `prismic-main-document` meta tags
    const $main = document.querySelectorAll(
      'meta[name="prismic-main-document"]'
    );
    // Get `prismic-documents` meta tags
    const $subs = document.querySelectorAll('meta[name="prismic-documents"]');

    // If page uses meta tags
    if ($main.length || $subs.length) {
      if (!silent) {
        // Warn about wrong `prismic-main-document` usage
        if ($main.length === 0) {
          console.warn(
            '[prismic-toolbar] No main document found, for better results, please declare your main document using the `prismic-main-document` meta tag.'
          );
        } else if ($main.length > 1) {
          console.warn(
            '[prismic-toolbar] Multiple `prismic-main-document` meta tags found, only the first one will be used.'
          );
        }
      }

      // Get main document
      const main = $main[0] ? $main[0].content : null;

      // Get sub documents
      const subs = [...$subs]
        .map(sub => sub.content.split(',').map(id => id.trim()))
        .flat()
        .filter((id, index, arr) =>
          id && arr.indexOf(id) === index && id !== main
        ) // Filters duplicates and main
        .slice(0, main ? 19 : 20); // Limit to a total of 20

      // Return if we have at least one document
      if (main || subs.length) {
        return { main, subs };
      }
    }

    return null;
  }

  // Start predictions for this URL
  start = async maybeTracker => {
    // wait for all requests to be played first (client side)
    this.dispatchLoading();
    // Wait less when using meta tags-based prediction since we'll have to query anyway after,
    // this allow for the edit button to be snappier
    await wait(this.getDocumentIDsFromMeta(true) ? 0.5 : 2);

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
      const docIDs = this.getDocumentIDsFromMeta();
      if (docIDs) {
        // Create client
        const client = createClient(`${this.apiEndPoint}/api/v2`);

        // Query main and sub documents
        try {
          await client.getByIDs([docIDs.main, ...docIDs.subs].filter(Boolean));
        } catch (error) {
          if (error instanceof ForbiddenError) {
            console.warn("[prismic-toolbar] Meta tags-based prediction doesn't work yet with private repositories.");
          } else {
            // Fail silently but log error for debugging ease
            console.error(error);
          }
        }
      }

      // Run prediction
      documentsSorted = await this.client.getPredictionDocs({
        ref: this.cookie.getRefForDomain(),
        url: window.location.pathname,
        tracker,
        location: getLocation(),
      });
      queriesResults = await this.client.getDevModeQueriesResults({
        tracker,
      });

      // Tamper with automatic prediction if user used meta tags-based prediction
      if (docIDs) {
        // Sort main document first when available
        if (docIDs.main) {
          documentsSorted = documentsSorted.sort((a, _b) => a.id === docIDs.main ? -1 : 1);
        }

        // All ids queried
        const ids = [docIDs.main, ...docIDs.subs].filter(Boolean);

        // Find the query made above in query results
        const allIDsQueryIndex = queriesResults.findIndex(query =>
          query.length === ids.length
          && query.every(doc => ids.includes(doc.id))
        );

        // If we found the query
        if (allIDsQueryIndex !== -1) {
          if (queriesResults.length === 1) {
            // If only the above query was made, improve the query results by grouping documents,
            // sorting the main one at top
            queriesResults = Object.values(queriesResults[allIDsQueryIndex].reduce((acc, doc) => {
              (acc[doc.type] ||= []).push(doc);

              return acc;
            }, {})).sort((a, _b) => a.some(doc => doc.id === docIDs.main) ? -1 : 1);
          } else {
            // Else filter queries from the above query
            queriesResults = [
              ...queriesResults.filter((_query, index) => index !== allIDsQueryIndex)
            ];
          }
        }
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
