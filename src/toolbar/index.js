import 'regenerator-runtime/runtime';
import { Publisher, normalizeState, fetchy, query } from 'common';

// State
const state = normalizeState(window.prismicState);
state.previewRef = window.previewRef || null; // TODO

// Prediction documents
const documents = async ({ url, track }) => (
  await fetchy({
    url: `/prediction/predict?${query({ url, track })}`,
    credentials: 'same-origin',
  });
);

// TODO normalize preview drafts (and documents?)

// Publish State
new Publisher({ state, documents });
