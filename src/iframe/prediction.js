import { fetchy, query, normalizeDocument, Sorter } from 'common';

export const documents = async ({ url, ref, track, location }) => {
  const data = await fetchy({
    url: `/toolbar/predict?${query({ url, ref, track })}`,
    credentials: 'same-origin',
  }).then(res => res.documents.map(normalizeDocument));

  return (
    // TODO test on a good website & maybe add scoring
    new Sorter(data)
      // .max(a => a.occurences) // No use case
      // .fuzzy(a => `${a.title} ${a.summary}`, text) // Sometimes wrong
      .max(a => a.updated)
      .min(a => a.urls.length)
      .min(a => a.queryTotal)
      .is(a => a.singleton)
      .min(a => a.priority)
      .is(a => location.search.match(a.slug))
      .is(a => location.hash.match(a.slug))
      .is(a => location.pathname.match(a.slug))
      .compute()
  );
};
