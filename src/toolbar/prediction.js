import { Hooks, wait, getLocation, fetchy, query, getCookie } from 'common';
import { PreviewCookie } from './cookies';

// Initial track
let initialTrack = PreviewCookie.track;

export class Prediction {
  constructor(messenger, apiEndPoint) {
    this.cookie = new PreviewCookie(messenger.hostname);
    this.messenger = messenger;
    this.hooks = new Hooks();
    this.documentHooks = [];
    this.documents = [];
    this.count = 0;
    this.apiEndPoint = apiEndPoint;
    this.baseEndPoint = apiEndPoint.substr(0, apiEndPoint.indexOf('/api'));
  }

  // Start predictions for this page load
  setup = async _ => {
    const { auth } = await this.messenger.post('state');
    if (!auth) return;
    await this.start();
    this.hooks.on('historyChange', this.start);
  }

  // Start predictions for this URL
  start = async _ => {
    // For initial page load SSR requests (match track -> url) and for quickly getting documents
    const fetch = this.predict(initialTrack || PreviewCookie.track)
    initialTrack = null;
    await fetch
  }

  // Fetch predicted documents
  predict = async (track = null) => {
    await this.dispatch(await this.messenger.post('documents', {
      ref: this.cookie.preview,  // The ref for the version of content to display
      url: window.location.pathname, // The URL for which we need the documents
      track, // Match the prior request to this URL
      location: getLocation(), // Help sort main document
    }));
  }

  // Dispatch documents to hooks
  dispatch = async (data) => {
    const docData = await this.getDocsData(data.queries)
    this.documents = data.documents;
    this.docData = docData;
    window.prismic._predictionDocuments = this.documents; // Debug
    Object.values(this.documentHooks).forEach(hook => hook(this.documents)); // Run the hooks
  }

  // Documents hook
  onDocuments = func => {
    const c = this.count++; // Create the hook key
    this.documentHooks[c] = func; // Create the hook
    return _ => delete this.documentHooks[c]; // Alternative to removeEventListener
  }

  // Get the masterRef through the api endpoint
  getMasterRef = async (apiEndPoint) => {
    const masterRef = await fetchy({
      url: `${apiEndPoint}`,
    }).then(res => {
      return res.refs.find( ele => {
       return ele.isMasterRef
      }).ref
    })
    return masterRef
  }

  // Get the data for each document and put it inside the json of the document
  getDocsData = async (queries) => {
    if(!queries){return}
    const promiseList = [];
    const dataList = [];
    queries.forEach(async queryParams => {
      const promise = this.getDataFromQuery(queryParams)
      promiseList.push(promise);
    })
    await Promise.all(promiseList).then(promisesRes => {
      promisesRes.forEach(query => {
        dataList.push(query);
      })
    })
    return dataList
  }

  // Do one query to get documents
  getDataFromQuery = async(queryParams) => {
    const data = await fetchy({
          url: `${this.baseEndPoint}/api/${queryParams.version}/documents/search?${query({
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
            })}` ,
          method: 'GET'
    }).then(res => res.results)
    return data
  }
}


