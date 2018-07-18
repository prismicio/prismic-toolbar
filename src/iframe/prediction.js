import { normalizeDocument, fetchy, query } from 'common';

export const documents = params =>
  fetchy({
    url: `/prediction/predict?${query(params)}`,
    credentials: 'same-origin',
  }).then(data => data.documents.map(normalizeDocument));
