const { withPolyfill } = require('common/polyfill'); // Support IE 11

withPolyfill(_ => {
  const { Publisher } = require('common');
  const { state, preview } = require('./utils');
  const { documents } = require('./prediction');
  const { newPreviewRef, closePreview, sharePreview } = require('./preview');
  const { trackDocumentClick, trackToolbarSetup } = require('./analytics');

  // Publish State
  new Publisher({
    state,
    preview,
    newPreviewRef,
    closePreview,
    sharePreview,
    documents,
    trackDocumentClick,
    trackToolbarSetup,
  });
})();