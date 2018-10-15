// TODO make iframe static so it loads faster (and easy to update prismic.js)
import { Publisher } from 'common';
import { auth, state, master, preview } from './config';
import { documents } from './prediction';
import { newPreviewRef, closePreview, sharePreview } from './preview';

// Publish State
new Publisher({
  auth,
  state,
  master,
  documents,
  preview,
  newPreviewRef,
  closePreview,
  sharePreview,
});
