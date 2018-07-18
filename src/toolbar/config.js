import { reload } from 'common';
import { Experiment } from './experiment';

// Globals
export const globals = {
  endpoint: null,
  ...window.prismic,
  startExperiment: expId => new Experiment(expId), // TODO automate
  setupEditButton: _ => _, // Legacy (log 'deprecated')
  version: process.env.npm_package_version,
  setup: _ => _, // TODO deprecated
};

// Validate prismic.endpoint
const matches = (globals.endpoint || '')
  .replace(/\.cdn/, '')
  .match(new RegExp('https?://[^/]*'));

// Set base URL
export const baseURL = matches ? matches[0] : null;

// Load original page URL
const { href } = window.location;
export const reloadOrigin = () => reload(href);
