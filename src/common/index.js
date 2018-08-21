export { getCookie, setCookie, deleteCookie, demolishCookie } from './cookie';
export { div, script, deleteNodes, appendCSS, shadow } from './domnodes';
export { Messenger } from './messenger';
export { Publisher } from './publisher';
export { Hooks } from './hooks';
export {
  normalizeDocument,
  normalizeDraft,
  normalizeState,
  normalizeRef,
  Sorter,
} from './normalize';

// Switchy
export const switchy = (val = '') => (obj = {}) => {
  if (typeof obj[val] === 'function') return obj[val]();
  return obj[val] || obj._ || null;
};

// Fetch Wrapper
export const fetchy = ({ url, ...other }) => fetch(url, other).then(r => r.json());

// Cutoff text ellipsis
export const ellipsis = (text, cutoff) =>
  text.length > cutoff ? text.substring(0, cutoff - 1) + '…' : text;

// ReadyDOM - DOM Listener is useless (await X is already asynchronous)
export const readyDOM = async () => {
  if (document.readyState !== 'complete') await wait(0);
  return true;
};

// Wait in seconds
export const wait = seconds => new Promise(rs => setTimeout(rs, seconds * 1000));

// Wait in milliseconds
export const delay = t => new Promise(rs => setTimeout(rs, t));

// Reload
export const reload = url => window.location.reload(url);

// Cookies disabled
export const disabledCookies = () => !navigator.cookieEnabled;

// Random id
export const random = num => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return [...Array(num)].map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// Build querystring
export const query = obj => {
  if (!obj) return '';
  return Object.entries(obj)
    .filter(v => v[1])
    .map(pair => pair.map(encodeURIComponent).join('='))
    .join('&');
};

// Parse querystring
export const parseQuery = _uri => {
  if (!_uri) return {};
  const qs = _uri.split('?')[1];
  if (!qs) return {};
  return qs
    .split('&')
    .filter(v => v)
    .map(v => v.split('='))
    .reduce(
      (acc, curr) =>
        Object.assign(acc, {
          [decodeURIComponent(curr[0])]: curr[1] && decodeURIComponent(curr[1]),
        }),
      {}
    );
};

// Invalid prismic endpoint
export const endpointWarning = () =>
  console.warn(`Invalid window.prismic.endpoint.
Learn how to set it up in the documentation: https://prismic.link/2LQcOWJ.
https://github.com/prismicio/prismic-toolbar`);

// Copy text to clipboard
export const copyText = text =>
  navigator.clipboard ? navigator.clipboard.writeText(text) : fallbackCopyText(text);

const fallbackCopyText = text => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  if (document.queryCommandEnabled('copy')) document.execCommand('copy');
  document.body.removeChild(textArea);
  return Promise.resolve(true);
};

// Throttle (https://codeburst.io/throttling-and-debouncing-in-javascript-b01cad5c8edf)
export const throttle = (func, timeout) => {
  let queue;
  let lastReturn;
  let lastRan = -Infinity;
  return function() {
    const since = Date.now() - lastRan;
    const due = since >= timeout;
    const run = () => {
      lastRan = Date.now();
      lastReturn = func.apply(this, arguments);
    };
    clearTimeout(queue);
    if (due) run();
    else queue = setTimeout(run, timeout - since);
    return lastReturn;
  };
};

// Memoize (can have a custom memoizer)
export const memoize = (func, memoizer) => {
  const memory = new Map();
  return function(...args) {
    const key = memoizer(...args) || JSON.stringify(args);
    if (!memory.has(key)) memory.set(key, func(...args));
    return memory.get(key);
  };
};

// Localstorage
export const localStorage = (key, defaultValue = null) => ({
  get() {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  },

  set(value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  remove() {
    window.localStorage.removeItem(key);
  },
});

// Simple location object
export const getLocation = () => {
  const { href, origin, protocol, host, hostname, port, pathname, search, hash } = window.location;
  return {
    href,
    origin,
    protocol,
    host,
    hostname,
    port,
    pathname,
    search,
    hash,
  };
};
