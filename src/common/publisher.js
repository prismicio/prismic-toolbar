// Publisher
export class Publisher {
  constructor(config) {
    listen(config);
  }
}

// Respond to Messenger
const post = (type, data = null) => window.parent.postMessage({ type, data }, '*');

// Follow Messenger protocol
const listen = obj =>
  window.addEventListener('message', async e => {
    const { type, data } = e.data;
    const action = obj[type];
    const result = typeof action === 'function' ? await action(data) : action;

    if (result === undefined) post(type);
    else post(type, result);
  });
