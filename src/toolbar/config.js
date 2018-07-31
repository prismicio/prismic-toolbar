import { reload } from 'common';
import { Experiment } from './experiment';

// Globals
export const globals = {
  endpoint: null,
  ...window.prismic,
  version: process.env.npm_package_version,
  setup: () => console.warn(`prismic.setup() is deprecated. It now initiates automatically.`),
  startExperiment: expId => new Experiment(expId), // TODO automate
  setupEditButton: () =>
    console.warn(
      `prismic.setupEditButton() is deprecated. Edit buttons have been replaced by the new Edit feature.`
    ),
};

// Validate prismic.endpoint
const matches = (globals.endpoint || '').replace(/\.cdn/, '').match(new RegExp('https?://[^/]*'));

// Set base URL
export const baseURL = matches ? matches[0] : null;

// Load original page URL
const { href } = window.location;
export const reloadOrigin = () => reload(href);
