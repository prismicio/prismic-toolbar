class Messenger {
  constructor(src) {
    this.isReady = false;
    this.iframe = document.createElement('iframe');
    this.iframe.src = src;

    document.head.appendChild(this.iframe);

    window.addEventListener('message', msg => {
      if (this.iframe.contentWindow !== msg.source) return;
      const { type, data } = msg.data;
      const event = new Event(type);
      event.detail = data;
      this.iframe.dispatchEvent(event);
    });
  }

  ready() {
    return new Promise(resolve => {
      if (this.isReady) return resolve();

      const setReady = () => {
        this.isReady = true;
        resolve();
      }

      this.iframe.addEventListener('ready', setReady, { once: true });
      this.iframe.addEventListener('load', setReady, { once: true });
    })
  }

  async post(type, data = null) {
    await this.ready();
    return new Promise(resolve => {
      this.iframe.contentWindow.postMessage({ type, data }, "*");
      this.iframe.addEventListener(type, e => resolve(e.detail), { once: true });
    });
  }
}

export default Messenger;
