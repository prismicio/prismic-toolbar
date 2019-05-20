import { eventToPromise } from '@common/promise-utils';
import ToolbarServiceClient from '@toolbar-service/client';
import { setup as setupIframe } from './iframe';
import { ToolbarServiceProtocol } from './messages';

const Client = {
  async get(/* string */iframeSourceUrl) /* Promise<Client> */ {
    const body = await Client.documentBodyReady();
    const iframe = Client.buildIframe(iframeSourceUrl);
    const { hostname } = new URL(iframeSourceUrl);
    body.appendChild(iframe);

    const loadedIframe = await eventToPromise(iframe, 'load', () => iframe);
    const portToIframe = await Client.establishConnection(loadedIframe);
    return new ToolbarServiceClient(portToIframe, hostname);
  },

  buildIframe(/* string */src) /* HTMLIFrameElement */ {
    const ifr = document.createElement('iframe');
    ifr.src = src;
    ifr.style.cssText = 'display:none!important';
    return ifr;
  },

  documentBodyReady() /* Promise<HTMLIFrameElement> */ {
    return new Promise(async resolve => {
      if (document.body) resolve(document.body);
      else document.addEventListener('DOMContentLoaded', () => resolve(document.body));
    });
  },

  establishConnection(/* HTMLIFrameElement */iframe) /* Promise<MessagePort> */ {
    return new Promise(resolve => {
      const { port1: portToIframe, port2: portToMainWindow } = new MessageChannel();

      portToIframe.onmessage = (/* MessageEvent */message => {
        if (message.data === ToolbarServiceProtocol.Ready) resolve(portToIframe);
        else throw new Error(`Unexpected message received before iframe ready: ${message.data}`);
      });

      if (iframe.contentWindow) iframe.contentWindow.postMessage(ToolbarServiceProtocol.SetupPort, '*', [portToMainWindow]);
      else throw Error('Unable to post a message the the toolbar iframe.');
    });
  }
};

const Iframe = {
  async setup() /* void */ {
    window.addEventListener('message', msg => Iframe.initialisationMessageHandler(msg));
  },

  initialisationMessageHandler(/* MessageEvent */message) /* void */ {
    if (message.data === ToolbarServiceProtocol.SetupPort) {
      window.removeEventListener('message', msg => Iframe.initialisationMessageHandler(msg));
      const portToMainWindow = message.ports[0];
      setupIframe(portToMainWindow);
      portToMainWindow.postMessage(ToolbarServiceProtocol.Ready);
    } else {
      throw Error(`Unexpected message received by the iframe: ${message}.\n Expected ${ToolbarServiceProtocol.SetupPort}`);
    }
  }
};

export const ToolbarService = { getClient: Client.get, setupIframe: Iframe.setup };
