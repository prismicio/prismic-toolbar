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

  getPreviewState() /* Promise<{ Object }> */ {
    return this._messageToPromise(Messages.PreviewState);
  }

  getPredictionDocs(data) /* Promise<[Boolean, Object[]]> */ {
    return this._messageToPromise(Messages.PredictionDocs, data);
  }

  updatePreview() /* Promise<{ reload: boolean, ref: string }> */ {
    return this._messageToPromise(Messages.UpdatePreview);
  }

  closePreviewSession() /* Promise<null> */ {
    return this._messageToPromise(Messages.ClosePreviewSession);
  }

  sharePreview(location, blob) /* Promise<string> */ {
    return this._messageToPromise(Messages.SharePreview, { location, blob });
  }

  trackDocumentClick(data) /* Promise<null> */ {
    return this._messageToPromise(Messages.TrackDocumentClick, data);
  }

  trackToolbarSetup() /* Promise<null> */ {
    return this._messageToPromise(Messages.TrackToolbarSetup);
  }
}
