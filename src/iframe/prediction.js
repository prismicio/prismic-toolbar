import { query, Sorter, fetchy } from '@common';

export async function getDocuments({ url, ref, tracker, location }) {
  const data = await fetchy({
    url: `/toolbar/predict?${query({ url, ref, tracker })}`
  }).then(res => {
    const resNormalized = res.documents.map(normalizeDocument);
    return { documents: resNormalized, queries: res.queries };
  }); // res looks like this {documents:{} , queries:{}}

  const sorted = (
    // from less important to most important
    new Sorter(data.documents)
    // .fuzzy(a => `${a.title} ${a.summary}`, text) // Sometimes wrong
    // .min(a => a.urls.length)
      .max(a => a.updated)
      .min(a => a.queryTotal)
      .is(a => a.uid && location.hash.match(a.uid))
      .is(a => a.uid && location.search.match(a.uid))
      .is(a => a.uid && location.pathname.match(a.uid))
      .min(a => a.urls.length)
      .min(a => a.weight)
      .is(a => a.singleton)
      .is(a => a.uid && location.hash.match(a.uid) && !a.singleton)
      .is(a => a.uid && location.search.match(a.uid) && !a.singleton)
      .is(a => a.uid && location.pathname.match(a.uid) && !a.singleton)
      .compute()
  );

  return ({
    documents: sorted,
    queries: data.queries
  });
}


function normalizeDocument(doc) {
  const status = (() => {
    if (doc.editorUrl.includes('c=unclassified')) return 'draft';
    if (doc.editorUrl.includes('c=release')) return 'release';
    if (doc.editorUrl.includes('c=variation')) return 'experiment';
    if (doc.editorUrl.includes('c=published')) return 'live';
    return null;
  })();

  return {
    ...doc,
    editorUrl: window.location.origin + doc.editorUrl,
    status
  };
}
