import { Messages } from './messages';

export default class Client {
  constructor(portToIframe, hostname) {
    this.port = portToIframe;
    this.hostname = hostname;
    this.events = document.createElement('span'); // EventTarget unsupported in IE

    // Send a custom event when we receive a result after we post a message to the iframe
    portToIframe.onmessage = msg => {
      const { type, data } = msg.data;
      const event = new CustomEvent(type, { detail: data });
      this.events.dispatchEvent(event);
    };
  }

  _messageToPromise(/* string */messageName, /* Object | null */data) /* Promise<T> */ {
    return new Promise(resolve => {
      this.events.addEventListener(messageName, e => resolve(e.detail), { once: true });
      this.port.postMessage({ type: messageName, data });
    });
  }

  get hostname() {
    return this.hostname;
  }

  getInitialData() {
    return this._messageToPromise(Messages.InitialData);
  }

  updatePreview() {
    return this._messageToPromise(Messages.UpdatePreview);
  }

  deletePreviewSession() {
    return this._messageToPromise(Messages.DeletePreviewSession);
  }

  sharePreview() {
    return this._messageToPromise(Messages.SharePreview);
  }

  trackDocumentClick() {
    return this._messageToPromise(Messages.TrackDocumentClick);
  }

  trackToolbarSetup() {
    return this._messageToPromise(Messages.TrackToolbarSetup);
  }
}
