export class Messenger {
  constructor(src) {
    this.ready = new Promise(rs => (this.becomeReady = rs));
    this.events = new EventTarget();

    this._setup(src);
  }

  async _setup(src) {
    // Await postMessage function
    const ifr = typeof src === 'string' && iframe(src);

    // Start Channels
    const { port1, port2 } = new MessageChannel();
    this.port = port1;
    port1.onmessage = this._dispatchEvent.bind(this); // 1: Prepare to handle all messages from port2

    // 2: Give port2 to window (when it can receive)
    if (ifr) (await ifr).contentWindow.postMessage('port', '*', [port2]);
    else src.postMessage('port', '*', [port2]);
  }

  async _dispatchEvent(msg) {
    if (msg.data === 'ready') return this.becomeReady(); // Init
    const { type, data } = msg.data;
    const event = new Event(type);
    event.detail = data != null ? data : null;
    this.events.dispatchEvent(event);
  }

  async post(type, data = null) {
    await this.ready;
    return new Promise(resolve => {
      this.events.addEventListener(type, e => resolve(e.detail), { once: true });
      this.port.postMessage({ type, data });
    });
  }
}

const iframe = src => {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  document.head.appendChild(iframe);
  return new Promise(
    resolve => iframe.addEventListener('load', () => resolve(iframe), { once: true }) // check this
  );
};
