import Share from './share';
import { baseURL } from './config';
import { readyDOM } from './utils';
import Globals, { startExp, setupEditButton } from './globals';
import Toolbar from './toolbar';

(async () => {
  // Invalid prismic.endpoint
  if (!baseURL) return console.warn('Invalid window.prismic.endpoint.\nhttps://github.com/prismicio/prismic-toolbar.');

  // Globals
  window.prismic = Globals;

  // Ready DOM
  await readyDOM();

  // Previews
  await Share.listen();

  // Experiments
  startExp();

  // Toolbar
  Toolbar.setup();

  // Edit Button
  setupEditButton();
})();
