import { fetchy, query, Sorter } from '@common';

export const getDocuments = async ({ url, ref, track, location }) => {
  const data = await fetchy({
    url: `/toolbar/predict?${query({ url, ref, track })}`,
  }).then(res => res.documents.map(normalizeDocument));

  return (
    new Sorter(data)
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
  );
};

function normalizeDocument(doc) {
  const status = (() => {
    if (doc.editorUrl.includes('c=unclassified')) return 'draft';
    if (doc.editorUrl.includes('c=release')) return 'release';
    if (doc.editorUrl.includes('c=variation')) return 'experiment';
    return null;
  })();

  return {
    ...doc,
    editorUrl: window.location.origin + doc.editorUrl,
    status
  };
}
