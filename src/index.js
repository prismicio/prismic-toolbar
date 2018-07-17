import Share from './share';
import Config from './config';
import { readyDOM } from './utils';
import { globals, startExp, setupEditButton } from './globals';
import Toolbar from './toolbar';

(async () => {
  // Invalid prismic.endpoint
  if (!Config.baseURL) return console.warn('Invalid window.prismic.endpoint. Learn how to set it up in the documentation: https://prismic.link/2LQcOWJ.\nhttps://github.com/prismicio/prismic-toolbar');

  // Globals
  window.prismic = window.PrismicToolbar = globals;

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
