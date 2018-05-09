// NOTE: Old debounce didn't work
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

export function wait(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// NOTE: DOM listener is useless because Promises run asynchonously.
export function readyDOM() {
  return Promise.resolve();
}

export function reload() {
  window.location.reload();
}

export function disabledCookies() {
  return !navigator.cookieEnabled;
}

export function iFrame(src) {
  return loadNode('iframe', src);
}

export function script(src) {
  return loadNode('script', src);
}

async function loadNode(type, src, body) {
  return new Promise(resolve => {
    // Prevent duplicates
    const duplicate = document.querySelector(`[src="${src}"]`);
    if (duplicate) return resolve(duplicate);

    // Create node
    const node = document.createElement(type);
    node.src = src;
    node.onload = resolve(node);

    // Append node
    if (body) document.body.appendChild(node);
    else document.head.appendChild(node);
  });
}
