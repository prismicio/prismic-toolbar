import 'regenerator-runtime/runtime';

export { getCookie, setCookie, deleteCookie, demolishCookie } from './cookie';
export { div, iFrame } from './domnodes';
export { Messenger } from './messenger';
export { Publisher } from './publisher';
export { Hooks } from './hooks';

// Switchy
export const switchy = (val = '') => (obj = {}) => {
  if (typeof obj[val] === 'function') return obj[val]();
  return obj[val] || obj._ || null;
};

// Fetch Wrapper
export const fetchy = ({ url, ...other }) => fetch(url, other).then(r => r.json());

// ReadyDOM - DOM Listener is useless (await X is already asynchronous)
export const readyDOM = () => Promise.resolve(true);

// Wait in seconds
export const wait = seconds =>
  new Promise(resolve => setTimeout(resolve, seconds * 1000));

// Reload
export const reload = () => window.location.reload();

// Cookies disabled
export const disabledCookies = () => !navigator.cookieEnabled;

// Load script
export const script = src => loadNode({ type: 'script', src });

// Random id
export function random(num) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return [...Array(num)]
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('');
}

// TODO
export const normalizeDocument = doc => doc;

export const normalizeDraft = draft =>
  Object.assign(
    {
      title: null,
      summary: null,
      url: null,
    },
    draft || {}
  );

// Parse Toolbar Bootstrap state
export const normalizeState = _state => {
  const state = {};
  state.guest = _state.isGuest;
  state.auth = _state.isAuthenticated;
  state.master = _state.masterRef;
  state.preview = _state.previewState || null;

  if (state.preview) {
    const old = state.preview;
    const p = {};

    p.ref = old.ref;
    p.title = old.title;
    p.updated = old.lastUpdate;
    p.drafts = []
      .concat(old.draftPreview)
      .concat(old.releasePreview)
      .filter(Boolean)
      .map(normalizeDraft);

    state.preview = p;
  }

  return state;
};

// Parse Prismic ref
export const normalizeRef = _ref => {
  let ref = _ref || null;
  if (ref) ref = ref.split('?')[0] || null;
  return {
    ref,
    url: null,
    track: null,
    breaker: null,
    ...parseQuery(_ref),
  };
};

// Build querystring
export function query(obj) {
  if (!obj) return '';
  return Object.entries(obj)
    .filter(v => v)
    .map(pair => pair.map(encodeURIComponent).join('='))
    .join('&');
}

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

// Wait in milliseconds TODO
export const delay = t => new Promise(resolve => setTimeout(resolve, t));

// Normalize string
export const slugify = str => str.normalize('NFD'); // TODO IE polyfill

// Invalid prismic endpoint
export const endpointWarning = () =>
  console.warn(`
Invalid window.prismic.endpoint.
Learn how to set it up in the documentation: https://prismic.link/2LQcOWJ.
https://github.com/prismicio/prismic-toolbar'
`);

// Debounce
export const debounced = _delay => func => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
      timeout = null;
    }, _delay);
  };
};

// Copy to clipboard TODO
export function copyToClipboard(text) {
  // IE specific code path to prevent textarea being shown while dialog is visible.
  if (window.clipboardData && window.clipboardData.setData) {
    return window.clipboardData.setData('Text', text);
  }

  if (document.queryCommandSupported('copy')) {
    const textarea = document.createElement('textarea');
    textarea.textContent = text;
    textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in MS Edge.
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand('copy'); // Security exception may be thrown by some browsers.
    } catch (ex) {
      console.warn('Copy to clipboard failed.', ex);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
