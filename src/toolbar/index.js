// TODO MAYBE NOT only polyfill if IE 11: https://cdn.jsdelivr.net/npm/@babel/polyfill@7.0.0-beta.52/dist/polyfill.min.js

// TODO If < IE 11 error "Not supported"

import { readyDOM, Messenger, Publisher } from 'common';
import { screenshot } from 'common/screenshot';
import { globals, repos } from './config';
import { Tracker } from './tracker';
import { Preview } from './preview';
import { Toolbar } from './toolbar';
const repository = repos[0]; // TODO support multi-repo

(async () => {
  // Invalid prismic.endpoint
  if (repos.length < 1) return warn`
    Please connect prismic.js to a repository (or several). For example, 
    <script async defer src=https://prismic.io/prismic.js?repo=my-repository,another-repository>`;

  // Globals (legacy, startExperiment)
  window.prismic = window.PrismicToolbar = globals;

  // Communicate with repository
  const messenger = new Messenger(`${window.location.protocol}//${repository}/toolbar/bootstrap/2`);
  new Publisher({ screenshot });

  // Request Tracker (prediction)
  new Tracker(messenger, repository);

  // Ready DOM
  await readyDOM();

  // Preview
  const preview = new Preview(messenger, repository);
  await preview.setup();

  // Toolbar
  new Toolbar({ messenger, preview, repository });
})();
