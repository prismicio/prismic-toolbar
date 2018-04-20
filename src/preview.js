import Cookies from './cookies';
import { config } from './config';

// Close the preview session (ie. discard the cookie)
function close() {
  config.corsLink.contentWindow.postMessage({ type: 'close', data: null }, '*');
  Cookies.removeAllPreviewCookies();
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
