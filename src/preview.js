import { preview } from './cookies';

// Close the preview session (ie. discard the cookie)
function close() {
  preview.remove();
}

function set(previewRef) {
  preview.set(previewRef);
}

function get() {
  return preview.get();
}

export default {
  close,
  set,
  get,
};
