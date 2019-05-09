// TODO Research stable method to connect with async iFrame, & allow multiple instances efficiently
// Messenger: String | Window -> Messenger

export function createMessenger(src) {
  const hostname = typeof src === 'string' ? new URL(src).hostname : null
  const events = document.createElement('span')
  return _setup(hostname, events, src)
}

async function _setup(hostname, events, src) {
  const body = await documentBody()
  console.log(body)
  const ifr = iframe(src);
  console.log(ifr)
  body.appendChild(ifr)

  await new Promise(resolve => {
    ifr.addEventListener('load', _ => {
      console.log('loaded')
      resolve(ifr)
    }, { once: true })
  })

  const { post } = establishConnection(ifr, events)

  return {
    hostname,
    events,
    post
  };
}

function establishConnection(ifr, events) {
  const { port1: connectionWithIframe, port2: connectionWithMain } = new MessageChannel();

  connectionWithIframe.onmessage = _dispatchEvent.bind(this, events)
  ifr.contentWindow.postMessage('port', '*', [connectionWithMain]);

  return {
    post: _post.bind(this, connectionWithIframe, events)
  }
}
async function _dispatchEvent(events, msg) {
  console.log('dispatch event', msg)
  // if (msg.data === 'ready') {
  //   return this.becomeReady(); // Init
  // }
  const { type, data } = msg.data;
  const event = new CustomEvent(type, { detail: data != null ? data : null });
  events.dispatchEvent(event);
}

async function _post(port, events, type, data = null) {
  console.log("post to the iframe")
  console.log(type)
  console.log(data)
  return new Promise(resolve => {
    events.addEventListener(type, e => resolve(e.detail), { once: true });
    port.postMessage({ type, data });
  });
}

function iframe(src) {
  //build the iframe
  const ifr = document.createElement('iframe');
  ifr.src = src;
  ifr.style.cssText='display:none!important';
  return ifr
}

function documentBody() {
  return new Promise(async resolve => {
    if (document.body) resolve(document.body);
    else document.addEventListener('DOMContentLoaded', _ => resolve(document.body));
  });
}

// export class Messenger {
//   constructor(src) {
//     this.hostname = typeof src === 'string' ? new URL(src).hostname : null;
//     this.ready = new Promise(rs => (this.becomeReady = rs));
//     this.events = document.createElement('span'); // EventTarget unsupported in IE
//     this._setup(src);
//   }

//   async _setup(src) {
//     // Await postMessage function
//     const ifr = typeof src === 'string' && iframe(src);

//     // Start Channels
//     const { port1, port2 } = new MessageChannel();
//     this.port = port1;
//     // 1: Prepare to handle all messages from port2
//     port1.onmessage = this._dispatchEvent.bind(this);

//     // 2: Give port2 to window (when it can receive)
//     if (ifr) (await ifr).contentWindow.postMessage('port', '*', [port2]);
//     else src.postMessage('port', '*', [port2]);
//   }

//   async _dispatchEvent(msg) {
//     if (msg.data === 'ready') {
//       return this.becomeReady(); // Init
//     }
//     const { type, data } = msg.data;
//     const event = new CustomEvent(type, { detail: data != null ? data : null });
//     this.events.dispatchEvent(event);
//   }

//   async post(type, data = null) {
//     await this.ready;
//     return new Promise(resolve => {
//       this.events.addEventListener(type, e => resolve(e.detail), { once: true });
//       this.port.postMessage({ type, data });
//     });
//   }
// }

// const documentBody = new Promise(async resolve => {
//   if (document.body) resolve(document.body);
//   else document.addEventListener('DOMContentLoaded', _ => resolve(document.body));
// });

// const iframe = src => new Promise(resolve => {
//   const ifr = document.createElement('iframe');
//   ifr.src = src;
//   ifr.style.cssText='display:none!important';
//   ifr.addEventListener('load', _ => resolve(ifr), { once: true })
//   documentBody.then(body => body.appendChild(ifr))
// });

export class Publisher {
    constructor(config) {
      this.config = config;
      // 1: Catch window event asking for port
      window.addEventListener('message', this.getPort.bind(this));
    }

    getPort(e) {
      console.log('getport', e)
      if (e.data !== 'port') return;
      window.removeEventListener('message', this.getPort.bind(this));

      const port = e.ports[0];
      this.listen(port); // 2: Wait for requests
      port.postMessage('ready'); // 3: Send 'ready' back through port
    }

    async listen(port) {
      port.onmessage = async e => {
        const { type, data } = e.data;
        const action = this.config[type];

        let result;
        if (typeof action === 'function') result = await action(data);
        else if (action != null) result = await action;
        else result = null;

        port.postMessage({ type, data: result });
      };
    }
  }
