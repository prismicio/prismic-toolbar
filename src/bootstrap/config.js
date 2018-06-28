import { Toolbar } from './toolbar';
import { Experiment } from './experiment';
import { Messenger } from './messenger';
import { debounced } from '../common';

// Globals
export const globals = {
  endpoint: null,
  ...window.prismic,
  startExperiment: expId => new Experiment(expId),
  setupEditButton: _ => _, // Legacy
  setup: debounced(200)(async _ => new Toolbar(await bootstrap.post('state'))),
  version: process.env.npm_package_version,
};

// Validate prismic.endpoint
const matches = globals.endpoint
  .replace(/\.cdn/, '')
  .match(new RegExp('https?://[^/]*'));

// Set base URL
export const baseURL = matches[0] || null;

// Start bootstrap (if valid URL)
export const bootstrap = baseURL && new Messenger(`${baseURL}/toolbar/bootstrap`);
