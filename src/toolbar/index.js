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

withPolyfill(async () => {
  const { getAbsoluteURL, getLegacyEndpoint } = require('./utils');
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
  repoEndpoints = Array.from(repoEndpoints);

  if (!repoEndpoints.length) warn`You are not connected to a repository.`;
  const repoConfigs = await (async () => {
    const acc = [];
    for (let i = 0; i < repoEndpoints.length; i += 1) {
      acc.push(await setup(repoEndpoints[i]));
    }
    return acc;
  })();
  run(repoConfigs);
})();

async function setup (rawInput) {
  // Imports
  const { ToolbarService } = require('@toolbar-service');
  const { parseEndpoint } = require('./utils');
  const { Preview } = require('./preview');
  const { Prediction } = require('./prediction');
  const { Analytics } = require('./analytics');
  const { PreviewCookie } = require('./preview/cookie');

  // Validate repository
  const domain = parseEndpoint(rawInput);
  const protocol = domain.match('.test$') ? window.location.protocol : 'https:';
  if (!domain) return warn`
    Failed to setup. Expected a repository identifier (example | example.prismic.io) but got ${rawInput || 'nothing'}`;

  // Communicate with repository
  const toolbarClient = await ToolbarService.getClient(`${protocol}//${domain}/prismic-toolbar/${version}/iframe.html`);
  const repoName = toolbarClient.hostname;
  const previewState = await toolbarClient.getPreviewState();
  const previewCookieHelper = new PreviewCookie(previewState.auth);
  // convert from legacy or clean the cookie if not authenticated
  const preview = new Preview(repoName, toolbarClient, previewCookieHelper, previewState);
  const prediction = previewState.auth
    && new Prediction(repoName, toolbarClient, previewCookieHelper);
  const analytics = previewState.auth && new Analytics(toolbarClient);

  // Start concurrently preview (always) and prediction (if authenticated)
  const { initialRef, upToDate } = await preview.setup();
  const { convertedLegacy } = previewCookieHelper.init(domain, initialRef);

  return [
    repoName,
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

function _formatPreviews(repoConfigs, reloadOrigin) {
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

function run(repositories) {
  if (repositories.length < 1) return;

  const { reloadOrigin } = require('./utils');
  const { Toolbar } = require('./toolbar');
  const shouldReload = repositories.reduce((acc, [, repoConfig]) => (
    acc || (repoConfig.computed.convertedLegacy || !repoConfig.computed.upToDate)
  ), false);

  if (shouldReload) {
    reloadOrigin();
  } else {
    const previewRepos = repositories
      .map(([, repoConfig]) => repoConfig)
      .filter(repoConfig => Boolean(repoConfig.computed.initialRef));

    const formattedPreviews = _formatPreviews(previewRepos, reloadOrigin);
    const predictionByRepo = _filterRepositoryAttribute(repositories, 'prediction');
    const analyticsByRepo = _filterRepositoryAttribute(repositories, 'analytics');
    // render toolbar
    new Toolbar({
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
