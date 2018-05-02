import Cookies from './cookies';

// Close the preview session (ie. discard the cookie)
function close() {
  Cookies.removePreviewCookie();
}

function set(previewRef) {
  Cookies.setPreviewToken(previewRef);
}

function get() {
  return Cookies.getPreviewToken();
}

export default {
  close,
  set,
  get,
};
