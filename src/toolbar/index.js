import './checkBrowser';
import { ToolbarService } from '@toolbar-service';
import { script } from '@common';
import { reloadOrigin, getAbsoluteURL } from './utils';
import { Preview } from './preview';
import { Prediction } from './prediction';
import { Analytics } from './analytics';
import { PreviewCookie } from './preview/cookie';

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
  setup: (...args) => {
    warn`window.prismic.setup is deprecated.`;
    args.forEach(setup);
  },
  startExperiment/* TODO automate */: expId => {
    const { Experiment } = require('./experiment');
    new Experiment(expId);
  },
  setupEditButton/* Legacy */: () => {
    warn`window.prismic.setupEditButton is deprecated.`;
  },
};

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

Promise.all(Array.from(repos).map(setup)).then(toolbars => {
  window.onfocus = function () {
    toolbars.forEach(toolbar => toolbar && toolbar.preview.watchPreviewUpdates());
  };

  window.onblur = function () {
    toolbars.forEach(toolbar => toolbar && toolbar.preview.cancelPreviewUpdates());
  };
});

// Setup the Prismic Toolbar for one repository TODO support multi-repo
let setupDomain = null;

async function setup (rawInput) {
  // Validate repository
  const domain = parseEndpoint(rawInput);

  if (!domain) return warn`
    Failed to setup. Expected a repository identifier (example | example.prismic.io) but got ${rawInput || 'nothing'}`;

  // Only allow setup to be called once
  if (setupDomain) return warn`
    Already connected to a repository (${setupDomain}).`;

  setupDomain = domain;

  const protocol = domain.match('.test$') ? window.location.protocol : 'https:';
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
  const displayPreview = Boolean(initialRef);

  if (convertedLegacy || !upToDate) {
    reloadOrigin();
  } else if (displayPreview || previewState.auth) {
    // eslint-disable-next-line no-undef
    await script(`${CDN_HOST}/prismic-toolbar/${version}/toolbar.js`);
    const toolbar = new window.prismic.Toolbar({
      displayPreview,
      auth: previewState.auth,
      preview,
      prediction,
      analytics
    });

    // Track initial setup of toolbar
    if (analytics) analytics.trackToolbarSetup();

    return toolbar;
  }
}

function parseEndpoint(repo) {
  if (!repo) return null;
  /* eslint-disable no-useless-escape */
  if (!/^(https?:\/\/)?[-a-zA-Z0-9.\/]+/.test(repo)) return null;
  // eslint-disable-next-line no-undef
  if (!repo.includes('.')) repo = `${repo}.prismic.io`;
  return repo;
}

function getLegacyEndpoint() {
  try {
    return new URL(window.prismic.endpoint).hostname.replace('.cdn', '');
  } catch (e) {
    return window.prismic.endpoint;
  }
}
