export { Messenger } from 'common';

// ReadyDOM - DOM Listener is useless (await X is already asynchronous)
export const readyDOM = Promise.resolve;

// Wait in seconds
export const wait = seconds => new Promise(resolve => setTimeout(resolve, seconds * 1000));

// Reload
export const reload = window.location.reload;

// Cookies disabled
export const disabledCookies = _ => !navigator.cookieEnabled;

// Decode URI Component
export const decode = decodeURIComponent;

// Load script
export const script = src => loadNode({ type: 'script', src });

// Load iFrame
export const iFrame = (src, options) => loadNode({
  type: 'iframe',
  src,
  options,
  body: true,
});

// Load something
async function loadNode({
  type, src, options, body,
}) {
  return new Promise(resolve => {
    // Prevent duplicates
    const duplicate = document.querySelector(`[src="${src}"]`);
    if (duplicate) return resolve(duplicate);

    // Create node
    const node = document.createElement(type);
    node = Object.assign(node, options, { src });
    node.onload = resolve(node);

    // Append node
    if (body) document.body.appendChild(node);
    else document.head.appendChild(node);
  });
}

// Parse Prismic ref
export const normalizeRef = _ref => {
  let ref = _ref || null;
  if (ref) ref = ref.split('?')[0] || null;
  return {
    ref,
    ...parseQuery(_ref),
  };
};

// Parse querystring
export const parseQuery = uri => (uri.split('?')[1] || '')
  .split('&')
  .filter(v => v)
  .map(v => v.split('='))
  .reduce(
    (acc, curr) => Object.assign(acc, {
      [decode(curr[0])]: decode(curr[1]),
    }),
    {},
  );

// Wait in milliseconds TODO
export const delay = t => new Promise(resolve => setTimeout(resolve, t));

// Normalize string
export const slugify = str => str.normalize('NFD'); // TODO IE polyfill

// Invalid prismic endpoint
export const endpointWarning = _ => console.warn(`
Invalid window.prismic.endpoint.
Learn how to set it up in the documentation: https://prismic.link/2LQcOWJ.
https://github.com/prismicio/prismic-toolbar'
`);

// Debounce
export const debounced = delay => func => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
      timeout = null;
    }, delay);
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
