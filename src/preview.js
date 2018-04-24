import Cookies from './cookies';
import Config from './config';
import Share from './share';

// Close the preview session (ie. discard the cookie)
function close() {
  Share.close();
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
