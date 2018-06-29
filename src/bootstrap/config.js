import { Toolbar } from './toolbar';
import { Experiment } from './experiment';
import { Messenger, debounced } from 'common';

// Globals
export const globals = {
  endpoint: null,
  ...window.prismic,
  startExperiment: expId => new Experiment(expId),
  setupEditButton: _ => _, // Legacy
  version: process.env.npm_package_version,
  setup: debounced(200)(async _ => {
    const state = bootstrap && (await bootstrap.post('state'));
    if (state) new Toolbar(state);
  }),
};

// Validate prismic.endpoint
const matches = (globals.endpoint || '')
  .replace(/\.cdn/, '')
  .match(new RegExp('https?://[^/]*'));

// Set base URL
export const baseURL = matches ? matches[0] : null;

// Start bootstrap (if valid URL)
export const bootstrap =
  baseURL && new Messenger(`${baseURL}/toolbar/bootstrap`);

// TODO
// isMember (csrf not empty)
// authorized (JWT?)
// preview { ref }
// master
