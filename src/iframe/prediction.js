import { query, Sorter, fetchy } from '@common';

export function sortDocsWithLocation(documents, location) {
  return new Sorter(documents)
  // .fuzzy(a => `${a.title} ${a.summary}`, text) // Sometimes wrong
  // .min(a => a.urls.length)
    .max(a => a.updated)
    .min(a => a.queryTotal)
    .is(a => a.uid && matchUIDInHash(location.hash, a.uid))
    .is(a => a.uid && matchUIDInQS(location.search, a.uid))
    .is(a => a.uid && matchUIDInPath(location.pathname, a.uid))
    .min(a => a.urls.length)
    .max(a => a.weight)
    .is(a => a.singleton)
    .is(a => a.uid && matchUIDInHash(location.hash, a.uid) && !a.singleton)
    .is(a => a.uid && matchUIDInQS(location.search, a.uid) && !a.singleton)
    .is(a => a.uid && matchUIDInPath(location.pathname, a.uid) && !a.singleton)
    .compute()
}

export async function getDocuments({ url, ref, tracker, location }) {
  const documents = await fetchy({
    url: `/toolbar/predict?${query({ url, ref, tracker })}`
  }).then(res => res.documents.map(normalizeDocument));


  const documentsSorted = sortDocsWithLocation(documents, location);

  return documentsSorted;
}

function matchUIDInHash(path, uid) {
  return matchUIDInPath(path, uid) || matchUIDInQS(path, uid);
}

function matchUIDInPath(path, uid) {
  return path.match(new RegExp(`/${uid}$`));
}

function matchUIDInQS(path, uid) {
  return path.match(new RegExp(`(.+)=${uid}(&.*)?$`));
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
