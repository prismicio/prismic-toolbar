import 'regenerator-runtime/runtime';
import {
  Publisher,
  normalizeState,
  normalizeDocument,
  fetchy,
  query,
  deleteCookie,
} from 'common';

// State
const state = normalizeState(window.prismicState);

// Prediction documents
const documents = async params =>
  await fetchy({
    url: `/prediction/predict?${query(params)}`,
    credentials: 'same-origin',
  }).then(data => data.documents.map(normalizeDocument));

// Close preview session
const closePreview = () => deleteCookie('io.prismic.previewSession');

// TODO Preview ref ping, Screenshot

// Publish State
new Publisher({ state, documents, closePreview });
