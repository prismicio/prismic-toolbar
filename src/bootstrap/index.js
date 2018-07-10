// TODO no promise/fetch, just babel-polyfill if IE 11, if <IE11, return warning 'not supported'
import 'promise-polyfill/src/polyfill';
import 'regenerator-runtime/runtime';
import 'whatwg-fetch';

import { readyDOM, endpointWarning, Messenger } from 'common';
import { globals, baseURL } from './config';
import { preview as previewCookie } from './cookies';
import { Prediction } from './prediction';
import { Toolbar } from './toolbar';

(async () => {
  // Invalid prismic.endpoint
  if (!baseURL) return endpointWarning();

  // Globals
  window.prismic = window.PrismicToolbar = globals;

  // State
  const messenger = new Messenger(`${baseURL}/toolbar/bootstrap`);
  const prediction = new Prediction(messenger);
  const documents = prediction.getDocuments();

  // Ready DOM
  await readyDOM();

  // Cleanup
  document
    .querySelectorAll('.wio-link, [data-wio-id], #io-prismic-toolbar')
    .forEach(el => el.remove());

  // Setup
  const { auth, master, preview } = await messenger.post('state'); // Get State
  previewCookie.state = { auth, master, messenger };
  prediction.active = auth;

  // Preview
  await previewCookie.setPreview(preview && preview.ref);

  // Toolbar
  new Toolbar({ auth, preview, documents: await documents });
})();
