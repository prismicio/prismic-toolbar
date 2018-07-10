// Load unique div in body
export const div = (id, obj) => {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  }
  Object.assign(el, obj);
  return el;
};

// Load iFrame
export const iFrame = (src, options) =>
  loadNode({
    type: 'iframe',
    src,
    options: Object.assign({ frameBorder: 0 }, options),
    body: true,
  });

// Load something
async function loadNode({ type, src, options, body }) {
  return new Promise(resolve => {
    // Prevent duplicates
    const duplicate = document.querySelector(`[src="${src}"]`);
    if (duplicate) return resolve(duplicate);

    // Create node
    let node = document.createElement(type);
    node = Object.assign(node, options, { src });
    node.onload = resolve(node);

    // Append node
    if (body) document.body.appendChild(node);
    else document.head.appendChild(node);
  });
}
