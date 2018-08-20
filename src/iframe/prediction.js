import { fetchy, query, normalizeDocument } from 'common';

export const documents = params =>
  fetchy({
    url: `/toolbar/predict?${query(params)}`,
    credentials: 'same-origin',
  }).then(data => data.documents.map(normalizeDocument));
