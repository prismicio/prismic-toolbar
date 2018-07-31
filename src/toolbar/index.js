// TODO only polyfill if IE 11: https://cdn.jsdelivr.net/npm/@babel/polyfill@7.0.0-beta.52/dist/polyfill.min.js
import 'promise-polyfill/src/polyfill';
import 'whatwg-fetch';

import 'regenerator-runtime/runtime';

// TODO If < IE 11 error "Not supported"

import { readyDOM, endpointWarning, Messenger, Publisher } from 'common';
import { screenshot } from 'common/screenshot';
import { globals, baseURL } from './config';
import { Tracker } from './tracker';
import { Preview } from './preview';
import { Toolbar } from './toolbar';

(async () => {
  // Invalid prismic.endpoint
  if (!baseURL) return endpointWarning();

  // Globals (legacy, startExperiment)
  window.prismic = window.PrismicToolbar = globals;

  // CORS
  const messenger = new Messenger(`${baseURL}/toolbar/bootstrap/2`);
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
