const NAMESPACE = 'io.prismic.'

let LISTEN_CALLBACKS = {};

function namespacedType(type) {
  return `${NAMESPACE}${type}`;
}

window.addEventListener('message', (e) => {
  const message = e.data;
  const callbacks = LISTEN_CALLBACKS[message.type] || [];
  const updatedCallbacks = callbacks.filter((callback) => {
    if (callback) {
      const { f, options } = callback;
      f && f(message.data);
      return (options && !options.once) || !options;
    }
    return false;
  });
  LISTEN_CALLBACKS[message.type] = updatedCallbacks;
});

function send(type, data) {
  parent.postMessage({ type: namespacedType(type), data }, '*');
}

function on(type, f, options) {
  const callbacks = LISTEN_CALLBACKS[namespacedType(type)] || [];
  const callback = { f, options }
  LISTEN_CALLBACKS[namespacedType(type)] = [callback].concat(callbacks);
}

export default {

  ping() {
    send('ping');
  },

  change(ref) {
    send('change', { ref });
  },

  reload(href) {
    send('reload', href);
  },

  closeSession() {
    send('closeSession');
  },

  toggle(target) {
    send('toggle', target);
  },

  display(dimensions) {
    send('display', dimensions);
  },

  screenshot(canvasOptions, page) {
    send('screenshot', { canvasOptions, page });
  },

  on,
};
