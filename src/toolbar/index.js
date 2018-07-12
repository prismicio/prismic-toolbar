// TODO rename to bootstrap-iframe

import 'regenerator-runtime/runtime';
import { Publisher, normalizeState } from 'common'; // TODO maybe no need for common
import { documents } from './prediction';
import { preview } from './preview';

// State
const state = normalizeState(window.prismicState);

// Auth
const auth = state.auth;

// TODO: checkPreviewRef

// Publish State
new Publisher({ auth, state, documents, ...preview(state) });
