import Cookies from 'js-cookie';

export function getCookie(name) {
  return Cookies.get(name); // or undefined
}

export function setCookie(name, value, expires = Infinity /* days */) {
  const path = '/';
  return Cookies.set(name, value, { path, expires, sameSite: 'lax' });
}

export function deleteCookie(name) {
  const path = '/';
  Cookies.remove(name, { path });
}

// TODO remove after we force no /preview route (url prediction)
export function demolishCookie(name) {
  const subdomains = window.location.hostname.split('.'); // ['www','gosport','com']
  const subpaths = window.location.pathname.slice(1).split('/'); // ['my','path']

  const DOMAINS = []
    .concat(subdomains.map((sub, idx) => `${subdomains.slice(idx).join('.')}`)) // www.gosport.com
    .concat(subdomains.map((sub, idx) => `.${subdomains.slice(idx).join('.')}`)) // .gosport.com
    .concat(null); // no domain specified

  const PATHS = []
    .concat(subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}`)) // /a/b/foo
    .concat(subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}/`)) // /a/b/foo/
    .concat('/') // root path
    .concat(null); // no path specified

  DOMAINS.forEach(domain =>
    PATHS.forEach(path => Cookies.remove(name, { domain, path }))
  );
}
