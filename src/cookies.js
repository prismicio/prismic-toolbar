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
    Cookies.set(PREVIEW_COOKIE_KEY, ref, { path: '/' });
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
    demolishCookie(PREVIEW_COOKIE_KEY);
  },
};


function demolishCookie(name) {
  const subdomains = window.location.hostname.split('.'); // ['www','gosport','com']
  const DOMAINS = subdomains
    .map((sub, idx) => `.${subdomains.slice(idx).join('.')}`) // .a.b.foo.com
    .slice(0, -1) // no more .com
    .concat(subdomains.join('.')) // website.gosport.com
    .concat(null); // no domain specified

  const subpaths = window.location.pathname.slice(1).split('/'); // ['my','path']
  const PATHS = subpaths
    .map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}`) // /a/b/foo
    .concat(subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}/`)) // /a/b/foo/
    .concat('/') // root path
    .concat(null); // no path specified

  DOMAINS.forEach(domain =>
    PATHS.forEach(path =>
      deleteCookie(name, domain, path)));
}


function deleteCookie(name, domain = null, path = '/') {
  const p = path ? `path=${path};` : '';
  const d = domain ? `domain=${domain};` : '';
  document.cookie = `${name}=;${p}${d}expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
