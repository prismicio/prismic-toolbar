import { Experiment } from './experiment';

// Globals
export const globals = {
  endpoint: null,
  ...window.prismic,
  startExperiment: expId => new Experiment(expId), // TODO automate
  setupEditButton: _ => _, // Legacy
  version: process.env.npm_package_version,
  setup: _ => _, // NOTE do we really need this? (more work for nothing)
};

// Validate prismic.endpoint
const matches = (globals.endpoint || '')
  .replace(/\.cdn/, '')
  .match(new RegExp('https?://[^/]*'));

// Set base URL
export const baseURL = matches ? matches[0] : null;
