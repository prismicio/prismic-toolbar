function _bodyReady() {
  return new Promise(async resolve => {
    if (document.body) resolve(document.body);
    else document.addEventListener('DOMContentLoaded', _ => resolve(document.body));
  });
}

function _connectIframeToMainHandler(event) {
  if (event.data !== 'port') return;
  window.removeEventListener('message', getPortToMain.bind(this));

  const iframeEvents = document.createElement('span')

  const portToMain = event.ports[0];
  _setupIframeMessageHandler(portToMain)

  return {
    postToMain: _post.bind(this, iframeEvents, portToMain)
  }
}

async function _post(events, portToIframe, type, data = null) {
  return new Promise(resolve => {
    events.addEventListener(type, e => resolve(e.detail), { once: true });
    portToIframe.postMessage({ type, data });
  });
}

async function _dispatchEvent(events, msg) {
  const { type, data } = msg.data;
  const event = new CustomEvent(type, { detail: data != null ? data : null });
  events.dispatchEvent(event);
}

async function buildIframe(src) {
  const ifr = document.createElement('iframe');
  ifr.src = src;
  ifr.style.cssText='display:none!important';
  return ifr
}

export const Iframes = {
  async connectMainToIframe({ iframeSrc, portToIframe, config }) {
    await _bodyReady()
    const iframeElement = await buildIframe(iframeSrc)

    //use to trigger an event when receive a message from the iframe.
    // When we catch the message, we resolve the promise of the post function so we get the response as a promise for the triggered action.
    const mainEvents = document.createElement('span')

    document.body.append(iframeElement)
    await new Promise(resolve => {
      iframeElement.addEventListener('load', _ => {
        resolve(ifr)
      }, { once: true })
    })

    _setupMainMessageHandler(portToIframe)

    iframeElement.contentWindow.postMessage('port', '*', [connectionWithMain]);

    return {
      hostname: typeof src === 'string' ? new URL(src).hostname : null,
      send: _post.bind(this, mainEvents, portToIframe),
    }
  },

  connectIframeToMain() {
    return new Promise(resolve => {
      window.addEventListener('message', (m) => {
        resolve(await _connectIframeToMainHandler(m))
      })
    })
  }
}

const Roles = {
  Sender: 'sender',
  Receiver: 'receiver'
}

function _setupMessageHandler(port) {
  port.onmessage = async e => {
    const { role, type, data } = e.data;

    if(role === Roles.receiver) {
      const action = this.config[type];

      let result;
      if (typeof action === 'function') result = await action(data);
      else if (action != null) result = await action;
      else result = null;

      port.postMessage({ type, data: result });
    } else if(role === Roles.sender) {
      const event = new CustomEvent(type, { detail: data != null ? data : null });
      events.dispatchEvent(event);
    }
  };
}