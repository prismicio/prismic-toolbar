import Cookies from './cookies';
import { config } from './config';

function removeForPaths(pathParts, domain) {
  let sizeWithoutLastPathPart;
  pathParts.forEach((pathPart, pathPartIndex) => {
    sizeWithoutLastPathPart = pathParts.length - 1;
    const path = pathParts.slice(pathPartIndex, sizeWithoutLastPathPart).join('/');
    Cookies.removePreviewCookie(`${path}/`, domain);
    Cookies.removePreviewCookie(`${path}/`, `.${domain}`);
    Cookies.removePreviewCookie(`${path}/`);
  });
}

// Close the preview session (ie. discard the cookie)
function close() {
  config.corsLink.contentWindow.postMessage({
    type: 'close',
    data: null,
  }, '*');

  const domainParts = document.location.hostname.split('.');
  const pathParts = document.location.pathname.split('/');

  removeForPaths(pathParts);

  domainParts.forEach((domainPart, domainPartIndex) => {
    const domain = domainParts.slice(domainPartIndex).join('.');
    removeForPaths(pathParts, domain);
  });
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
