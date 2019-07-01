import { Hooks, getLocation, wait, fetchy, query } from '@common';

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
    return protocol + '://' + this.client.hostname + '/api';
  }

  // Set event listener
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
      const { documentsSorted, queries } = await this.client.getPredictionDocs({
        ref: this.cookie.getRefForDomain(),
        url: window.location.pathname,
        tracker,
        location: getLocation()
      });
      const queriesInfos = await this.getDocsData(queries);
      this.dispatch(documentsSorted, queriesInfos);
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

  // Get the data for each document and put it inside the json of the document
  getDocsData = /* List[Object] */queries => /* Promise */ {
    if (!queries) { return; }
    const promiseList = queries.map(queryParams => this.getDataFromQuery(queryParams));
    return Promise.all(promiseList);
  }

  // Do one query to get documents
  getDataFromQuery = async /* Object */queryParams => /* Promise */ {
    const data = await fetchy({
      url: `${this.apiEndPoint}/${queryParams.version}/documents/search?${query({
        version: queryParams.version,
        ref: queryParams.ref,
        integrationFieldsRef: queryParams.integrationFieldsRef,
        q: queryParams.q,
        orderings: queryParams.orderings,
        page: queryParams.page,
        requestedPageSize: queryParams.requestedPageSize,
        after: queryParams.after,
        referer: queryParams.referer,
        fetch: queryParams.fetch,
        fetchLinks: queryParams.fetchLinks,
        graphQuery: queryParams.graphQuery,
        languageCode: queryParams.languageCode,
        withMeta: queryParams.withMeta
      })}`,
      method: 'GET'
    }).then(res => res.results);
    return data;
  }
}
