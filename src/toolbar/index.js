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

let repoEndpoints = new Set();

// Prismic variable is available
window.dispatchEvent(new CustomEvent('prismic'));

// Auto-querystring setup
const scriptURL = new URL(getAbsoluteURL(document.currentScript.getAttribute('src')));
const repoParam = scriptURL.searchParams.get('repo');
if (repoParam !== null) repoEndpoints = new Set([...repoEndpoints, ...repoParam.split(',')]);

// Auto-legacy setup
window.repoEndpoints = repoEndpoints;
const legacyEndpoint = getLegacyEndpoint();
if (legacyEndpoint) {
  warn`window.prismic.endpoint is deprecated.`;
  repoEndpoints.add(legacyEndpoint);
}

if (!repoEndpoints.size) warn`You are not connected to a repository.`;

repoEndpoints = [...repoEndpoints];
Promise.all(repoEndpoints.map(setup)).then(run);


async function setup (rawInput) {
  // Validate repository
  const domain = parseEndpoint(rawInput);

  if (!domain) return warn`
    Failed to setup. Expected a repository identifier (example | example.prismic.io) but got ${rawInput || 'nothing'}`;

  const protocol = domain.match('.test$') ? window.location.protocol : 'https:';
  const toolbarClient = await ToolbarService.getClient(`${protocol}//${domain}/prismic-toolbar/${version}/iframe.html`);
  const previewState = await toolbarClient.getPreviewState();
  const previewCookieHelper = new PreviewCookie(previewState.auth);
  // convert from legacy or clean the cookie if not authenticated
  const preview = new Preview(toolbarClient, previewCookieHelper, previewState);

  const prediction = previewState.auth && new Prediction(toolbarClient, previewCookieHelper);
  const analytics = previewState.auth && new Analytics(toolbarClient);

  // Start concurrently preview (always) and prediction (if authenticated)
  const { initialRef, upToDate } = await preview.setup();
  const { convertedLegacy } = previewCookieHelper.init(domain, initialRef);

  return [
    toolbarClient.hostname,
    {
      previewState,
      preview,
      prediction,
      analytics,
      computed: { initialRef, upToDate, convertedLegacy }
    }
  ];
}

function _filterRepositoryAttribute(repositories, attributeName) {
  return repositories.reduce((acc, [repoName, config]) => {
    const attribute = config[attributeName];
    return Object.assign({}, acc, attribute ? { [repoName]: attribute } : {});
  }, {});
}

function _formatPreviews(repoConfigs) {
  const previews = repoConfigs.map(r => r.preview);
  return {
    title: previews.map(p => p.title).join(' | '),
    documents: previews.reduce((acc, p) => [...acc, ...p.documents], []),
    active: previews.reduce((acc, p) => acc || p.active, false),
    display: repoConfigs.reduce((acc, config) => (
      acc || (config && Boolean(config.computed.initialRef))
    ), false),
    auth: repoConfigs.reduce((acc, config) => (
      acc || (config && config.previewState.auth)
    ), false),
    share: async () => {
      const results = await Promise.all(previews.map(p => p.share()));
      if (results.length !== previews.length) return null;
      return previews.map((preview, index) => ({ preview, url: results[index] }));
    },
    end: async () => {
      const reload = await (async () => {
        const results = await Promise.all(previews.map(p => p.end()));
        return results.reduce((acc, { shouldReload }) => acc || shouldReload, false);
      })();
      if (reload) reloadOrigin();
    },
    raw: previews,
  };
}

async function run(repositories) {
  if (repositories.length < 1) return;

  const shouldReload = repositories.reduce((acc, [, repoConfig]) => (
    acc || (repoConfig.computed.convertedLegacy || !repoConfig.computed.upToDate)
  ), false);

  const displayPreview = repositories.reduce((acc, [, repoConfig]) => (
    acc || Boolean(repoConfig && repoConfig.computed.initialRef)
  ), false);

  const auth = repositories.reduce((acc, [, repoConfig]) => (
    acc || (repoConfig && repoConfig.previewState.auth)
  ), false);

  if (shouldReload) {
    reloadOrigin();
  } else if (displayPreview || auth) {
    const previewRepos = repositories
      .map(([, repoConfig]) => repoConfig)
      .filter(repoConfig => Boolean(repoConfig.computed.initialRef));

    const formattedPreviews = _formatPreviews(previewRepos);

    const predictionByRepo = _filterRepositoryAttribute(repositories, 'prediction');
    const analyticsByRepo = _filterRepositoryAttribute(repositories, 'analytics');

    // eslint-disable-next-line no-undef
    await script(`${CDN_HOST}/prismic-toolbar/${version}/toolbar.js`);
    new window.prismic.Toolbar({
      displayPreview,
      previews: formattedPreviews,
      predictionByRepo,
      analyticsByRepo
    });

    // Track initial setup of toolbar
    Object.keys(analyticsByRepo).forEach(repoName => {
      analyticsByRepo[repoName].trackToolbarSetup();
    });
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
