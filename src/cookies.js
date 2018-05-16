import Cookies from 'js-cookie';
import { reload } from './utils';

export const preview = {
  key: 'io.prismic.preview',
  get: () => getCookie(preview.key),
  set: val => {
    if (val === getCookie(preview.key)) return; // cookie already exists
    setCookie(preview.key, val, 0.1); // 0.1 prevents bad ref
    reload();
  },
  remove: () => {
    if (!getCookie(preview.key)) return; // cookie already deleted
    demolishCookie(preview.key); // if /preview set a strange cookie
    reload();
  },
};

export const experiment = {
  key: 'io.prismic.experiment',
  get: () => getCookie(experiment.key),
  set: (expId, variation) => {
    const val = [expId, variation].join(' ');
    if (val === getCookie(experiment.key)) return; // cookie already exists
    setCookie(experiment.key, val);
    reload();
  },
  remove: () => {
    if (!getCookie(experiment.key)) return; // cookie already deleted
    deleteCookie(experiment.key);
    reload();
  },
};


function getCookie(name) {
  return Cookies.get(name);
}

function setCookie(name, value, expires/* days */) {
  const path = '/';
  return Cookies.set(name, value, { path, expires });
}

function deleteCookie(name) {
  const path = '/';
  Cookies.remove(name, { path });
}

// TODO: Legacy after we force url prediction
function demolishCookie(name) {
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
    PATHS.forEach(path =>
      Cookies.remove(name, { domain, path })));
}
