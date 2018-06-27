export * from './cookie';
export * from './hooks';

// Pages
export const pages = {
  DOCS: 0,
  SHARE: 1,
};

// Switchy
export const switchy = val => opt => opt[val] || opt._;

// Random id
export function random(num) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return [...Array(num)]
    .map(_ => chars[Math.floor(Math.random() * chars.length)])
    .join('');
}

// Set cookie
export function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * days);
  document.cookie = `${name}=${value};path=/;expires=${d.toGMTString()}`;
}

// Get cookie
export function getCookie(name) {
  const v = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);
  return v ? v[2] : null;
}

// Build querystring
export function query(obj) {
  return Object.entries(obj)
    .map(pair => pair.map(encodeURIComponent).join('='))
    .join('&');
}

// Parse querystring
export function parseRef(ref) {
  if (!ref) return null;
  return ref.split('?')[0] || null;
}

// Parse querystring
export function parseQuery(uri) {
  return (uri.split('?')[1] || '')
    .split('&')
    .filter(v => v)
    .map(v => v.split('='))
    .reduce(
      (acc, curr) =>
        Object.assign(acc, {
          [decodeURIComponent(curr[0])]: decodeURIComponent(curr[1]),
        }),
      {},
    );
}
