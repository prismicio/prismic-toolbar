// TODO no more promise/fetch, just babel-polyfill if IE 11, if <IE11, return warning 'not supported'
import 'promise-polyfill/src/polyfill';
import 'regenerator-runtime/runtime';
import 'whatwg-fetch';

import { readyDOM, endpointWarning, normalizeState, Messenger, iFrame } from 'common';
import { globals, baseURL } from './config';
import { preview } from './cookies';
import { Prediction } from './prediction';
import { Preview } from './preview';
import { Toolbar } from './toolbar';

(async () => {
  // Invalid prismic.endpoint
  if (!baseURL) return endpointWarning();

  // Globals
  window.prismic = window.PrismicToolbar = globals;

  // State
  const messenger = new Messenger(`${baseURL}/toolbar/bootstrap`);
  const prediction = new Prediction(messenger);

  // Ready DOM
  await readyDOM();

  // Cleanup
  document
    .querySelectorAll('.wio-link, [data-wio-id], #io-prismic-toolbar')
    .forEach(el => el.remove());

  // Setup
  const { auth, master, preview, previewRef } = await messenger.post('state');
  preview.setPreview(previewRef);
  preview.setState({ auth, master });
  prediction.setState({ auth });

  // Toolbar
  const documents = await prediction.documents;
  new Toolbar({ auth, preview, documents });
})();
