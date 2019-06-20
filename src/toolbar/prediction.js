import { Hooks, getLocation, wait, fetchy, query } from '@common';
import { hostname } from 'os';
import applicationMode from '../../application-mode';

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

  buildApiEndpoint = () => {
    const protocol = process.env.MODE === applicationMode.DEV ? 'http' : 'https';
    const domain = (() => {
      switch (process.env.APP_MODE) {
        case applicationMode.DEV: return 'wroom.test';
        case applicationMode.PROD: return 'prismic.io';
        case applicationMode.STAGE: return 'wroom.io';
        default: return '';
      }
    })();
    return protocol + '://' + hostname + '.' + domain + '/api';
  }

  // Start predictions for this page load
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
      const { documents, queries } = await this.client.getPredictionDocs({
        ref: this.cookie.getRefForDomain(),
        url: window.location.pathname,
        tracker: this.cookie.getTracker(),
        location: getLocation()
      });
      const queriesInfos = await this.getDocsData(queries);
      this.dispatch(documents, queriesInfos);
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
  getDocsData = async queries => {
    if (!queries) { return; }
    const promiseList = [];
    const dataList = [];
    queries.forEach(async queryParams => {
      const promise = this.getDataFromQuery(queryParams);
      promiseList.push(promise);
    });
    await Promise.all(promiseList).then(promisesRes => {
      promisesRes.forEach(q => {
        dataList.push(q);
      });
    });
    return dataList;
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
