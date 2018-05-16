import Experiments from './experiments';
import EditButton from './editbtn';
import Preview from './preview';
import Toolbar from './toolbar';
import Globals from './globals';
import { readyDOM } from './utils';
import { baseURL } from './config';

(async () => {
  // Invalid prismic.endpoint
  if (!baseURL) return console.warn('Invalid window.prismic.endpoint.\nhttps://github.com/prismicio/prismic-toolbar.');

  // Globals
  window.prismic = Globals;

  // Ready DOM
  await readyDOM();

  // Previews
  await Preview.start();

  // Toolbar
  Toolbar.setup();

  // Edit Button
  EditButton.setup();
})();
