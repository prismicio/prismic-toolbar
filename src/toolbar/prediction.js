import { normalizeDocument } from 'common';

export const documents = params => {
  return fetchy({
    url: `/prediction/predict?${query(params)}`,
    credentials: 'same-origin',
  }).then(data => data.documents.map(normalizeDocument));
};
