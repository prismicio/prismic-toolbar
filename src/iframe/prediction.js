import { fetchy, query, Sorter } from '@common';

export const getPredictionDocuments = async ({ url, ref, track, location }) => {
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

const normalizeDocument = doc => ({
  ...doc,
  editorUrl: window.location.origin + doc.editorUrl,
  status: (
    doc.editorUrl.includes('c=unclassified') ? 'draft'
      : doc.editorUrl.includes('c=release') ? 'release'
        : doc.editorUrl.includes('c=variation') ? 'experiment'
          : null
  ),
});
