import { fetchy, query, normalizeDocument, Sorter } from 'common';

export const documents = async params => {
  const data = await fetchy({
    url: `/toolbar/predict?${query(params)}`,
    credentials: 'same-origin',
  }).then(res => res.documents.map(normalizeDocument));

  return (
    new Sorter(data)
      .max(a => a.updated)
      .max(a => a.occurences)
      // .missing(a => a.title, /(^|\s)nav/i)
      // .max(a => a.summary.length)
      .min(a => a.urls.length)
      .min(a => a.queryTotal)
      .min(a => a.priority)
      .in(a => a.slug, window.location.search)
      .in(a => a.slug, window.location.hash)
      .in(a => a.slug, window.location.pathname)
      .compute()
  );
};
