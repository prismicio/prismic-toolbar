const oneLine = (...str) => String.raw(...str).split('\n').map(line => line.trim()).join('\n')
  .trim();

// Console warn one-liner
export const warn = (...str) => console.warn('Prismic Toolbar\n\n' + oneLine(...str));
export const err = (...str) => { throw new Error('Prismic Toolbar\n\n' + oneLine(...str)); };

// Is pure Object
export const isObject = val => Boolean(val && typeof val === 'object' && val.constructor === Object);

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

/* ----- ADD ELLIPSIS IF NECESSARY TO VALUE ----- */
export const stringCheck = (string, maxStringSize) => /* String */ {
  if (string.length >= maxStringSize) {
    return (string.substring(0, maxStringSize) + '...');
  }
  return string;
};

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
    const key = memoizer ? memoizer(...args) : JSON.stringify(args);
    if (!memory.has(key)) memory.set(key, func(...args));
    return memory.get(key);
  };
};

// Once
export const once = func => {
  let result;
  let done;
  return function(...args) {
    if (!done) {
      result = func(...args);
      done = true;
    }
    return result;
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

// Generate a shadow DOM

export const shadow = attr => {
  const div = document.createElement('div');
  Object.entries(attr).forEach(([key, value]) => {
    if (key === 'style') {
      return Object.assign(div.style, value);
    }
    return div.setAttribute(key, value);
  });
  const shadowRoot = document.head.attachShadow && div.attachShadow({ mode: 'open' });
  document.body.appendChild(div);
  return shadowRoot || div;
};

// Delete DOM nodes with CSS query
export const deleteNodes = cssQuery => {
  document.querySelectorAll(cssQuery).forEach(el => el.remove());
};

// Append Stylesheet to DOM node
export const appendCSS = (el, css) => {
  const style = document.createElement('style');
  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));
  el.appendChild(style);
};

// Load script
export function script(src) {
  return new Promise(resolve => {
    let el = document.getElementById(src);
    if (!el) {
      el = document.createElement('script');
      el.id = src;
      el.src = src;
      document.head.appendChild(el);
    }
    el.addEventListener('load', () => resolve(el));
  });
}
