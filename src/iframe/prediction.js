import { fetchy, query, Sorter } from 'common';

export const documents = async ({ url, ref, track, location }) => {
  const data = await fetchy({
    url: `/toolbar/predict?${query({ url, ref, track })}`,
  }).then(res => {
    const resNormalized = res.documents.map(normalizeDocument)
    return {documents: resNormalized, queries: res.queries}
  }); // res looks like this {documents:{} , queries:{}}

  const sorter = new Sorter(data.documents)
     // .max(a => a.occurences) // No use case
     // .fuzzy(a => `${a.title} ${a.summary}`, text) // Sometimes wrong
     .max(a => a.updated)
     .min(a => a.urls.length)
     .min(a => a.queryTotal)
     .is(a => a.singleton)
     .min(a => a.priority)
     .is(a => location.search.match(a.uid))
     .is(a => location.hash.match(a.uid))
     .is(a => location.pathname.match(a.uid))
     .compute()
     
  return ({
    documents: sorter,
    queries: data.queries
  });
};

const normalizeDocument = doc => ({
  ...doc,
  editorUrl: window.location.origin + doc.editorUrl,
  status: (
    doc.editorUrl.includes('c=unclassified') ? 'draft' :
    doc.editorUrl.includes('c=release') ? 'release' :
    doc.editorUrl.includes('c=variation') ? 'experiment' :
    null
  ),
})
