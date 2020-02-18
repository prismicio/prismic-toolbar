const { withPolyfill } = require('@common/polyfill'); // Support IE 11 TODO

const version = process.env.npm_package_version;

const warn = (...message) => require('@common').warn`
${String.raw(...message)}

Please remove your current Prismic Toolbar installation and replace it with

<script async defer src=//static.cdn.prismic.io/prismic.js?repo=example-repository&new=true></script>

For complete documentation on setting up the Prismic Toolbar, please refer to
https://prismic.io/docs/javascript/beyond-the-api/in-website-preview`;

// Prismic Toolbar Interface
window.prismic = window.PrismicToolbar = {
  endpoint: null,
  ...window.prismic/* Legacy */,
  version,
  setup: withPolyfill((...args) => {
    warn`window.prismic.setup is deprecated.`;
    args.forEach(setup);
  }),
  startExperiment/* TODO automate */: withPolyfill(expId => {
    const { Experiment } = require('./experiment');
    new Experiment(expId);
  }),
  setupEditButton/* Legacy */: withPolyfill(() => {
    warn`window.prismic.setupEditButton is deprecated.`;
  }),
};

withPolyfill(() => {
  const { getAbsoluteURL, getLegacyEndpoint } = require('./utils');
  let repos = new Set();

  // Prismic variable is available
  window.dispatchEvent(new CustomEvent('prismic'));

  // Auto-querystring setup
  const scriptURL = new URL(getAbsoluteURL(document.currentScript.getAttribute('src')));
  const repoParam = scriptURL.searchParams.get('repo');
  if (repoParam !== null) repos = new Set([...repos, ...repoParam.split(',')]);

  // Auto-legacy setup
  const legacyEndpoint = getLegacyEndpoint();
  if (legacyEndpoint) {
    warn`window.prismic.endpoint is deprecated.`;
    repos.add(legacyEndpoint);
  }

  if (!repos.size) warn`Your are not connected to a repository.`;

  repos.forEach(setup);
})();

// Setup the Prismic Toolbar for one repository TODO support multi-repo
let setupDomain = null;
async function setup (rawInput) {
  // Imports
  const { ToolbarService } = require('@toolbar-service');
  const { parseEndpoint, reloadOrigin } = require('./utils');
  const { Preview } = require('./preview');
  const { Prediction } = require('./prediction');
  const { Analytics } = require('./analytics');
  const { Toolbar } = require('./toolbar');
  const { PreviewCookie } = require('./preview/cookie');

  // Validate repository
  const domain = parseEndpoint(rawInput);
  const protocol = domain.match('.test$') ? window.location.protocol : 'https:';

  if (!domain) return warn`
    Failed to setup. Expected a repository identifier (example | example.prismic.io) but got ${rawInput || 'nothing'}`;

  // Only allow setup to be called once
  if (setupDomain) return warn`
    Already connected to a repository (${setupDomain}).`;

  setupDomain = domain;

  // Communicate with repository
  const toolbarClient = await ToolbarService.getClient(`${protocol}//${domain}/prismic-toolbar/${version}/iframe.html`);
  const previewState = await toolbarClient.getPreviewState();
  const previewCookieHelper = new PreviewCookie(previewState.auth, toolbarClient.hostname);
  // convert from legacy or clean the cookie if not authenticated
  const preview = new Preview(toolbarClient, previewCookieHelper, previewState);

  const prediction = previewState.auth && new Prediction(toolbarClient, previewCookieHelper);
  const analytics = previewState.auth && new Analytics(toolbarClient);

  // Start concurrently preview (always) and prediction (if authenticated)
  const { initialRef, upToDate } = await preview.setup();
  const { convertedLegacy } = previewCookieHelper.init(initialRef);

  if (convertedLegacy || !upToDate) {
    reloadOrigin();
  } else {
    // render toolbar
    new Toolbar({
      displayPreview: Boolean(initialRef),
      auth: previewState.auth,
      preview,
      prediction,
      analytics
    });

    // Track initial setup of toolbar
    if (analytics) analytics.trackToolbarSetup();
  }
}
