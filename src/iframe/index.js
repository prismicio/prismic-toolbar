(async _ => {
  // Support IE 11
  const { isIE, polyfillIE } = require('common/polyfill');
  if (isIE) await polyfillIE();

  const { Publisher } = require('common');
  const { state, preview } = require('./config');
  const { documents } = require('./prediction');
  const { newPreviewRef, closePreview, sharePreview } = require('./preview');

  // Publish State
  new Publisher({
    state,
    preview,
    newPreviewRef,
    closePreview,
    sharePreview,
    documents,
  });
})();
