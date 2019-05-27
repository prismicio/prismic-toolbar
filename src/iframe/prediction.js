import { query, Sorter } from '@common';

export async function getDocuments({ url, ref, tracker, location }) {
  const [isPartialContent, data] = await (async () => {
    const res = await fetch(`/toolbar/predict?${query({ url, ref, tracker })}`);
    const docs = await res.json();
    const partial = res.status === 206;
    return [partial, docs.map(normalizeDocument)];
  })();

  const sorted = (
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
  return [isPartialContent, sorted];
}

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
