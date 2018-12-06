const { withPolyfill } = require('common/polyfill'); // Support IE 11 (TODO after build is fixed)

// Prismic Toolbar Interface
window.prismic = window.PrismicToolbar = {
  endpoint: null, ...window.prismic/*Legacy*/,
  version: process.env.npm_package_version,
  setup: withPolyfill((...args) => args.forEach(setup)),
  startExperiment/*TODO automate*/: withPolyfill(expId => new require('./experiment').Experiment(expId)),
  setupEditButton/*Legacy*/: withPolyfill(_ => require('common').warn`
     prismic.setupEditButton() is deprecated.
     Edit buttons have been replaced by the new Edit feature.
  `),
};

// Legacy setup
withPolyfill(_ => {
  const { getLegacyEndpoint } = require('./utils')
  const { warn } = require('common')
  const domain = getLegacyEndpoint()
  if (domain) warn`
    Using window.prismic.endpoint is deprecated.
    Please set up the Prismic Toolbar by calling the
    setup function with your repository name.
    window.prismic.setup('example') OR
    window.prismic.setup('example.prismic.io')
  `
  setup(domain)
})()

// Setup the Prismic Toolbar for one repository TODO support multi-repo
let isSetup = false;
async function setup (rawInput) {
  // Imports
  const { Messenger, Publisher, warn } = require('common');
  const { screenshot } = require('common/screenshot');
  const { Tracker } = require('./tracker');
  const { Preview } = require('./preview');
  const { Prediction } = require('./prediction');
  const { Analytics } = require('./analytics');
  const { Toolbar } = require('./toolbar');

  // Validate repository
  const domain = parseEndpoint(rawInput)

  if (!domain) return warn`
    Invalid prismic.js configuration.
    Expected a repository but got ${rawInput || 'nothing'}.`;

  // Only allow setup to be called once
  if (isSetup) return warn`
    The Prismic Toolbar can only connect to one repository.
    Multi-repo support is in the roadmap.`;

  isSetup = true;

  // Communicate with repository
  const messenger = new Messenger(`${window.location.protocol}//${domain}/toolbar/iframe`);
  new Publisher({ screenshot });

  // Request Tracker (prediction)
  new Tracker(messenger);

  // Preview & Prediction
  const preview = new Preview(messenger);
  const prediction = new Prediction(messenger);
  const analytics = new Analytics(messenger);

  // Start concurrently
  await Promise.all([preview.setup(), prediction.setup()]);

  // Do not render toolbar while reloading (reload is async)
  if (preview.shouldReload) return;

  // Toolbar
  new Toolbar({ messenger, preview, prediction, analytics });

  // Track initial setup of toolbar
  analytics.trackToolbarSetup();
}