import coookies from './coookies';

function removeForPaths(pathParts, domain) {
  let sizeWithoutLastPathPart;
  pathParts.forEach((pathPart, pathPartIndex) => {
    sizeWithoutLastPathPart = pathParts.length - 1;
    const path = pathParts.slice(pathPartIndex, sizeWithoutLastPathPart).join('/');
    if (domain) {
      coookies.removeItem(coookies.PREVIEW_COOKIE_KEY, { path: `${path}/`, domain });
      coookies.removeItem(coookies.PREVIEW_COOKIE_KEY, { path: `${path}/`, domain: `.${domain}` });
    } else {
      coookies.removeItem(coookies.PREVIEW_COOKIE_KEY, { path: `${path}/` });
    }
  });
}

// Close the preview session (ie. discard the cookie)
function close() {
  const domainParts = document.location.hostname.split('.');
  const pathParts = document.location.pathname.split('/');

  removeForPaths(pathParts);

  domainParts.forEach((domainPart, domainPartIndex) => {
    const domain = domainParts.slice(domainPartIndex).join('.');
    removeForPaths(pathParts, domain);
  });
}

function set(previewRef) {
  coookies.setPreviewToken(previewRef);
}

function get() {
  return coookies.getPreviewToken();
}

export default {
  close,
  set,
  get,
};
