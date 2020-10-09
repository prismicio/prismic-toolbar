// Div
export const div = (id, options = {}) => {
  const { style, ...otherOpts } = options;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    document.body.appendChild(el);
  }
  Object.assign(el.style, style);
  Object.assign(el, otherOpts, { id });
  return el;
};

// Shadow DOM
export const shadow = (id, options) => {
  let _shadow = div(id, options);
  if (document.head.attachShadow) _shadow = _shadow.attachShadow({ mode: 'open' });
  return _shadow;
};

// Delete DOM nodes matching CSS query
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
