const { withPolyfill } = require('@common/polyfill'); // Support IE 11

withPolyfill(() => {
  const { newPreviewRef, closePreview, sharePreview } = require('./preview');
  const { trackDocumentClick, trackToolbarSetup } = require('./analytics');

  // Publish State
  new Publisher({
    newPreviewRef,
    closePreview,
    sharePreview,
    trackDocumentClick,
    trackToolbarSetup,
  });
})();
