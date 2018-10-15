export const div = (id, options) => node({ type: 'div', id, options });

export const shadow = (id, options) => {
  let _shadow = div(id, options);
  if (document.head.attachShadow) _shadow = _shadow.attachShadow({ mode: 'open' });
  return _shadow;
};

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

// Load something
function node({ id, type, body = true, options = {} }) {
  const { style, ...otherOpts } = options;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(type);
    document[body ? 'body' : 'head'].appendChild(el);
  }
  Object.assign(el.style, style);
  Object.assign(el, otherOpts, { id });
  return el;
}

// Load script
export function script(src) {
  return new Promise(resolve => {
    let el = document.getElementById(src);
    if (!el) {
      el = document.createElement('script');
      el.id = src
      el.src = src
      document.head.appendChild(el);
    }
    el.addEventListener('load', () => resolve(el));
  });
}
