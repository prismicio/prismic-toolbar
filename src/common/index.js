// Bootstrap

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

// Toolbar

export function delay(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

export function slugify(str) {
  return str.normalize('NFD') // TODO IE polyfill
}

export function copyToClipboard(text) {
  if (window.clipboardData && window.clipboardData.setData) {
    // IE specific code path to prevent textarea being shown while dialog is visible.
    return window.clipboardData.setData("Text", text);

  } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
    var textarea = document.createElement("textarea");
    textarea.textContent = text;
    textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand("copy");  // Security exception may be thrown by some browsers.
    } catch (ex) {
      console.warn("Copy to clipboard failed.", ex);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
