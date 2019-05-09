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
  portToMain.onmessage = m => _dispatchEvent(iframeEvents, m)

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

export const Iframes = {
  connectMainToIframe({ iframeElement, portToIframe}) {
    await _bodyReady()

    //use to trigger an event when receive a message from the iframe.
    // When we catch the message, we resolve the promise of the post function so we get the response as a promise for the triggered action.
    const mainEvents = document.createElement('span')

    document.body.append(iframeElement)
    portToIframe.onmessage = m => _dispatchEvent(mainEvents, m)
    iframeElement.contentWindow.postMessage('port', '*', [connectionWithMain]);

    return {
      postToIframe: _post.bind(this, mainEvents, portToIframe)
    }
  },

  connectIframeToMain() {
    window.addEventListener('message', _connectIframeToMainHandler.bind(this))
  }
}