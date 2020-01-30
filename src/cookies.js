import Cookies from 'js-cookie';

const PREVIEW_COOKIE_KEY = 'io.prismic.preview';
const EXPERIMENT_COOKIE_KEY = 'io.prismic.experiment';

export default {
  PREVIEW_COOKIE_KEY,
  EXPERIMENT_COOKIE_KEY,
  getPreviewToken() {
    return Cookies.get(PREVIEW_COOKIE_KEY);
  },
  getExperimentToken() {
    return Cookies.get(EXPERIMENT_COOKIE_KEY);
  },
  setPreviewToken(ref) {
    Cookies.set(PREVIEW_COOKIE_KEY, ref, { path: '/', sameSite: 'lax' });
  },
  removeExperimentToken() {
    Cookies.remove(EXPERIMENT_COOKIE_KEY);
  },
  setExperimentToken(expId, variation) {
    const token = [expId, variation].join(' ');
    const expires = 60 * 60 * 24 * 30;
    Cookies.set(EXPERIMENT_COOKIE_KEY, token, { expires, path: '/' });
  },
  removePreviewCookie() {
    close();
  },
};


// TODO LEGACY
function removeForPaths(pathParts, domain) {
  let sizeWithoutLastPathPart;
  pathParts.forEach((pathPart, pathPartIndex) => {
    sizeWithoutLastPathPart = pathParts.length - 1;
    const path = pathParts.slice(pathPartIndex, sizeWithoutLastPathPart).join('/');
    removePreviewCookie(`${path}/`, domain);
    removePreviewCookie(`${path}/`, `.${domain}`);
    removePreviewCookie(`${path}/`);
  });
}

// TODO LEGACY
function close() {
  const domainParts = document.location.hostname.split('.');
  const pathParts = document.location.pathname.split('/');

  removeForPaths(pathParts);

  domainParts.forEach((domainPart, domainPartIndex) => {
    const domain = domainParts.slice(domainPartIndex).join('.');
    removeForPaths(pathParts, domain);
  });
}

// TODO LEGACY
function removePreviewCookie(path, domain) {
  const pathOption = path ? { path } : {};
  const domainOption = domain ? { domain } : {};
  const expiresOption = { expires: -1 };
  const options = Object.assign(pathOption, domainOption, expiresOption);
  Cookies.remove(PREVIEW_COOKIE_KEY, options);
}
