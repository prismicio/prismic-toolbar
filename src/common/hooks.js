// Export Hooks
export class Hooks {
  constructor() {
    this.hooks = [];
  }

  _removeHook(type, callback) {
    window.removeEventListener(type, callback);
    this.hooks = this.hooks.filter(hook => !(hook.type === type && hook.callback === callback));
  }

  _removeType(type) {
    this.hooks
      .filter(hook => hook.type === type)
      .forEach(hook => window.removeEventListener(type, hook.callback));

    this.hooks = this.hooks.filter(hook => hook.type !== type);
  }

  _removeAll() {
    this.hooks.forEach(hook => window.removeEventListener(hook.type, hook.callback));
    this.hooks = [];
  }

  on = (type, callback) => {
    window.addEventListener(type, callback);
    this.hooks.push({ type, callback });
    return callback;
  };

  off = (type, callback) => {
    if (type && callback) this._removeHook(type, callback);
    else if (type) this._removeType(type);
    else this._removeAll();
  };
}

// Window event
function event(type, detail = null) {
  const e = new CustomEvent(type, { detail });
  window.dispatchEvent(e);
}

// XMLHttpRequest hook
const oldXML = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.send = function(...args) {
  const oldChange = this.onreadystatechange;

  event('beforeRequest', args);

  this.onreadystatechange = () => {
    if (this.readyState === 2) event('afterRequest', args);
    if (oldChange) oldChange();
  };

  return oldXML();
};

// Fetch hook
const oldFetch = window.fetch;

window.fetch = async (...args) => {
  if (args[1] && args[1].emitEvents === false) return oldFetch(...args);
  event('beforeRequest', args);
  const response = await oldFetch(...args);
  event('afterRequest', args);
  return response;
};

// History hook
const _wr = function(type) {
  const orig = window.history[type];
  return function() {
    const rv = orig.apply(this, arguments);
    const e = new CustomEvent(type, { detail: arguments });
    window.dispatchEvent(e);
    return rv;
  };
};
window.history.pushState = _wr('historyChange');
window.history.replaceState = _wr('historyChange');

// Active Tab Hook
window.addEventListener('focus', () => {
  event('activeTab', true);
});

window.addEventListener('blur', () => {
  event('activeTab', false);
});
