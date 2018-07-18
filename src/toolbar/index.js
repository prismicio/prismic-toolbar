// TODO no promise/fetch, just babel-polyfill if IE 11, if <IE11, return warning 'not supported'
import 'promise-polyfill/src/polyfill';
import 'regenerator-runtime/runtime';
import 'whatwg-fetch';

import { readyDOM, endpointWarning, Messenger, deleteNodes } from 'common';
import { globals, baseURL } from './config';
import { Preview } from './preview';
import { Toolbar } from './toolbar';

(async () => {
  // Invalid prismic.endpoint
  if (!baseURL) return endpointWarning();

  // Globals
  window.prismic = window.PrismicToolbar = globals;

  // State
  const messenger = new Messenger(`${baseURL}/toolbar/bootstrap`);
  const preview = new Preview(messenger);

  // Ready DOM
  await readyDOM();

  // Cleanup
  deleteNodes('.wio-link, [data-wio-id], #io-prismic-toolbar');

  // Preview
  await preview.setup();

  // Toolbar
  new Toolbar({ messenger, preview });
})();
