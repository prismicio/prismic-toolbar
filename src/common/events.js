export const toolbarEvents = {
  prismic: 'prismic',
  previewUpdate: 'prismicPreviewUpdate',
  previewEnd: 'prismicPreviewEnd'
};

/**
 * Dispatches an event with given data
 *
 * @param {string} event - Event name
 * @param {?any} data - Data to attach to the event
 *
 * @return {boolean} - `true` if event `event.preventDefault()`
 * was not called (event was not cancelled)
 */
export const dispatchToolbarEvent = (event, data = null) =>
  window.dispatchEvent(new CustomEvent(event, {
    detail: data,
    cancelable: true
  }));
