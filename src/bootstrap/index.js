// TODO no more promise/fetch. just babel-polyfill if IE 11
import 'promise-polyfill/src/polyfill';
import 'regenerator-runtime/runtime';
import 'whatwg-fetch';

import { readyDOM, endpointWarning } from 'common';
import { Ref } from './ref';
import { Toolbar } from './toolbar';
import { globals, baseURL, bootstrap } from './config';

// TODO if <IE11, return warning ('not supported')

(async () => {
  // Invalid prismic.endpoint
  if (!baseURL) return endpointWarning();

  // Globals
  window.prismic = globals;
  window.PrismicToolbar = globals;

  // Ready DOM
  await readyDOM();

  // Setup
  const state = await bootstrap.post('state');
  const ref = new Ref(state);
  const toolbar = new Toolbar(state);
})();
