const { withPolyfill } = require('common/polyfill'); // Support IE 11 (TODO after build is fixed)

// Prismic Toolbar Interface
window.prismic = window.PrismicToolbar = {
  endpoint: null, ...window.prismic/*Legacy*/,
  version: process.env.npm_package_version,
  setup: withPolyfill((...args) => args.forEach(setup)),
  startExperiment/*TODO automate*/: withPolyfill(expId => new (require('./experiment')).Experiment(expId)),
  setupEditButton/*Legacy*/: withPolyfill(_ => require('common').warn`
     window.prismic.setupEditButton is deprecated.
     Edit buttons have been replaced by the new Edit feature.
  `),
};

withPolyfill(_ => { 
  const { getLegacyEndpoint } = require('./utils');
  const { warn, getAbsoluteURL } = require('common');
  let repos = new Set();

  // Prismic variable is available
  window.dispatchEvent(new CustomEvent('prismic'))

  // Auto-querystring setup
  const scriptURL = new URL(getAbsoluteURL(document.currentScript.getAttribute('src')));
  const repoParam = scriptURL.searchParams.get('repo');
  if (repoParam !== null) repos = new Set([...repos, ...repoParam.split(',')]);

  // Auto-legacy setup
  const legacyEndpoint = getLegacyEndpoint();
  if (legacyEndpoint) {
    warn`
    window.prismic.endpoint is deprecated.
    Please remove your current Prismic Toolbar installation and replace it with
    
    <script async defer src=//prismic.io/prismic.js?repo=example-repository></script>

    For complete documentation on setting up the Prismic Toolbar, please refer to
    https://prismic.io/docs/javascript/beyond-the-api/in-website-preview`;
    repos.add(legacyEndpoint);
  }

  repos.forEach(setup);
})()

// Setup the Prismic Toolbar for one repository TODO support multi-repo
let setupDomain = null;
async function setup (rawInput) {
  // Imports
  const { Messenger, Publisher, warn } = require('common');
  const { fixPreviewCookie } = require('./cookies');
  const { parseEndpoint } = require('./utils');
  const { screenshot } = require('common/screenshot');
  const { Tracker } = require('./tracker');
  const { Preview } = require('./preview');
  const { Prediction } = require('./prediction');
  const { Analytics } = require('./analytics');
  const { Toolbar } = require('./toolbar');

  // Fix broken preview cookies and ensure the path is /
  fixPreviewCookie()

  // Validate repository
  const domain = parseEndpoint(rawInput)

  if (!domain) return warn`
    Failed to setup. Expected a repository identifier (example | example.prismic.io) but got ${rawInput || 'nothing'}`;

  // Only allow setup to be called once
  if (setupDomain) return warn`
    Already connected to a repository (${setupDomain}).`;

  setupDomain = domain;

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