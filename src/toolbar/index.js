import { readyDOM, Messenger, Publisher, isIE } from 'common';
import { screenshot } from 'common/screenshot';
import { globals, repos } from './config';
import { Tracker } from './tracker';
import { Preview } from './preview';
import { Toolbar } from './toolbar';
const repository = repos[0]; // TODO support multi-repo

(async () => {
  // TODO support IE 11
  if (isIE()) return warn`Prismic toolbar does not support Internet Explorer.`;

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
  new Tracker(messenger);

  // Ready DOM
  await readyDOM();

  // Preview
  const preview = new Preview(messenger);
  await preview.setup();

  // Toolbar
  new Toolbar({ messenger, preview });
})();
