export class Publisher {
  constructor(config) {
    this.config = config;
    // 1: Catch window event asking for port
    window.addEventListener('message', this.getPort.bind(this));
  }

  getPort(e) {
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
      else if (action != null) result = action;
      else result = null;

      port.postMessage({ type, data: result });
    };
  }
}
