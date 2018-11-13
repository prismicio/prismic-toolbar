(async _ => {
  // Support IE 11 TODO finish this
  const { isIE, polyfillIE } = require('common/polyfill');
  if (isIE) await polyfillIE();

  // TODO see Toolbar.scala for more todos

  // Imports
  const { readyDOM, Messenger, Publisher } = require('common');
  const { screenshot } = require('common/screenshot');
  const { globals, repos } = require('./config');
  const { Tracker } = require('./tracker');
  const { Preview } = require('./preview');
  const { Toolbar } = require('./toolbar');
  const repository = repos[0]; // TODO support multi-repo

  // Invalid prismic.endpoint
  if (repos.length < 1) return warn`
    Please connect prismic.js to a repository (or several). For example, 
    <script async defer src=https://prismic.io/prismic.js?repo=my-repository,another-repository>`;

  // Globals (legacy, startExperiment)
  window.prismic = window.PrismicToolbar = globals;

  // Communicate with repository
  const messenger = new Messenger(`${window.location.protocol}//${repository}/toolbar/iframe`);
  new Publisher({ screenshot });

  // Request Tracker (prediction)
  new Tracker(messenger);

  // Ready DOM
  await readyDOM();

  // Preview
  const preview = new Preview(messenger);
  await preview.setup();

  // Do not render toolbar while reloading (reload is async)
  if (preview.shouldReload) return;

  // Toolbar
  new Toolbar({ messenger, preview });
})();
