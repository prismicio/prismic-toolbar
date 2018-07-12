export const div = ({ id, options }) => node({ id, type: 'div', options });
export const script = src => srcNode({ type: 'script', src });

export const deleteNodes = cssQuery => {
  document.querySelectorAll(cssQuery).forEach(el => el.remove());
};

// Load something
function node({ id, type, options, body = true }) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(type);
    document[body ? 'body' : 'head'].appendChild(el);
  }
  Object.assign(el, options, { id });
  return el;
}

// Load something with src
async function srcNode({ src, type, options, body = false }) {
  return new Promise(resolve => {
    const el = node({ id: src, type, options: { ...options, src }, body });
    el.onload = resolve(el);
  });
}
