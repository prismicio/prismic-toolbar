import { Hooks, getLocation, wait, fetchy, query } from '@common';
import applicationMode from '../../application-mode';

export class Prediction {
  constructor(client, previewCookie) {
    this.client = client;
    this.cookie = previewCookie;
    this.hooks = new Hooks();
    this.documentHooks = [];
    this.documentLoadingHooks = [];
    this.documents = [];
    this.queries = [];
    this.count = 0;
    this.retry = 0;
    this.apiEndPoint = this.buildApiEndpoint();
  }

  buildApiEndpoint = () => {
    const protocol = applicationMode.DEV === 'development' ? 'http' : 'https';
    return protocol + '://' + this.client.hostname + '/api';
  }

  // Set event listener
  setup = async () => {
    await this.start();
    this.hooks.on('historyChange', this.start);
  }

  // Start predictions for this URL
  start = async () => {
    // wait for all requests to be played first (client side)
    this.dispatchLoading();
    await wait(2);
    // load prediction
    await this.predict();
    this.cookie.refreshTracker();
  }

  // Fetch predicted documents
  predict = () => (
    new Promise(async resolve => {
      const { documentsSorted, queries } = await this.client.getPredictionDocs({
        ref: this.cookie.getRefForDomain(),
        url: window.location.pathname,
        tracker: this.cookie.getTracker(),
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
    this.documents = documents;
    this.queries = queries;
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

  // Get the masterRef through the api endpoint
  getMasterRef = async apiEndPoint => {
    const masterRef = await fetchy({
      url: `${apiEndPoint}`,
    }).then(res => (
      res.refs.find(ele => ele.isMasterRef).ref
    ));
    return masterRef;
  }

  // Get the data for each document and put it inside the json of the document
  getDocsData = queries => {
    if (!queries) { return; }
    const promiseList = queries.map(queryParams => this.getDataFromQuery(queryParams));
    return Promise.all(promiseList);
  }

  // Do one query to get documents
  getDataFromQuery = async queryParams => {
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
