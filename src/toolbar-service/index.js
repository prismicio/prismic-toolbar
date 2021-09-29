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
  // If initialization has been delayed
  initializationDelayed: false,
  // Warning messages to be shown upon delayed initialization
  initializationDelayedTimeouts: [],
  // If iframe has been initialized
  initialized: false,

  async setup() /* void */ {
    // Reset initialization state (iframe should only be setup once though)
    Iframe.initializationDelayed = false;
    Iframe.initializationDelayedTimeouts = [];
    Iframe.initialized = false;

    window.addEventListener('message', msg => Iframe.initialisationMessageHandler(msg));
  },

  initialisationMessageHandler(/* MessageEvent */message) /* void */ {
    if (message.data === ToolbarServiceProtocol.SetupPort) {
      // Checking for `initialized` has a quicker effect than removing the listener
      // because we can check for it after
      Iframe.initialized = true;

      window.removeEventListener('message', msg => Iframe.initialisationMessageHandler(msg));
      const portToMainWindow = message.ports[0];
      setupIframe(portToMainWindow);
      portToMainWindow.postMessage(ToolbarServiceProtocol.Ready);

      // Clear all ongoing timeouts
      Iframe.initializationDelayedTimeouts.forEach(timeout => clearTimeout(timeout));

      // If iframe has been delayed, let the user know that the toolbar managed to get ready
      if (Iframe.initializationDelayed) {
      // eslint-disable-next-line no-console
        console.info('%cPrismic toolbar initialized successfully! This message only appears when unexpected messages were received by the iframe during Prismic toolbar setup.\n', 'color: #52b256;');
      }
    } else if (!Iframe.initialized) {
      // Setting a timeout allows to buffer first few messages the iframe might receive
      // when waiting for its own init message
      Iframe.initializationDelayedTimeouts.push(setTimeout(() => {
        // If timeout is reached, then iframe had been delayed and may not be initialized
        Iframe.initializationDelayed = true;
        console.warn(`Unexpected message received by the iframe during Prismic toolbar setup.\n\nExpected: ${ToolbarServiceProtocol.SetupPort}\nReceived: ${typeof message.data === 'string' ? message.data : JSON.stringify(message.data)}\n\nThis can happen due to an extension tampering with iframes (Dashlane, MetaMask, etc.)\n\nAn explicit message following this one will let you know if the toolbar was successfully initialized.`);
      }, 500));
    }
  }
};

export const ToolbarService = { getClient: Client.get, setupIframe: Iframe.setup };
