// Delete cookie
const deleteCookie = name =>
  (document.cookie = name + '=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT');

// Respond to Messenger
const post = (type, data) => window.parent.postMessage({ type, data }, '*');

// Messenger protocol
const listen = obj =>
  window.addEventListener('message', e => {
    const { type } = e.data;
    const action = obj[type];
    const result = typeof action === 'function' ? action() : action;

    if (result === undefined) post(type);
    else post(type, result);
  });

// Listen
listen({
  ref: window.prismicState,
  close: _ => deleteCookie(x),
});
