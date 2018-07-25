// TODO no promise/fetch, just babel-polyfill if IE 11, if <IE11, return warning 'not supported'
import 'promise-polyfill/src/polyfill';
import 'regenerator-runtime/runtime';
import 'whatwg-fetch';

import { readyDOM, endpointWarning, Messenger, Publisher } from 'common';
import { screenshot } from 'common/screenshot';
import { globals, baseURL } from './config';
import { Tracker } from './tracker';
import { Preview } from './preview';
import { Toolbar } from './toolbar';

// TODO work with foyer demo project

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
