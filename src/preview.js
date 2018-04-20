import Cookies from './cookies';
import Config from './config';

// Close the preview session (ie. discard the cookie)
function close() {
  Config.corsLink.contentWindow.postMessage({ type: 'close' }, '*');
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
