import { deleteCookie, getCookie, once, setCookie } from '@common';
import { startDocumentHeightReporting } from './document-height';

const pushMarkerWindowName = 'prismic:embedded-preview';
const pollMarkerWindowName = 'prismic:embedded-preview:poll';
const previewCookieName = 'io.prismic.preview';

const setRefMessageType = 'prismic:embedded-preview:set-ref';
const readyMessageType = 'prismic:embedded-preview:ready';
const ackMessageType = 'prismic:embedded-preview:ack';

const allowedParentOrigins = [
  /^https:\/\/([^/]+\.)?prismic\.io$/,
  /^https:\/\/([^/]+\.)?wroom\.io$/,
  /^https:\/\/([^/]+\.)?dev-tools-wroom\.com$/,
  /^https:\/\/([^/]+\.)?marketing-tools-wroom\.com$/,
  /^https:\/\/([^/]+\.)?platform-wroom\.com$/,
  /^https:\/\/([^/]+\.)?devops-wroom\.com$/,
  /^https:\/\/[a-z0-9-]+-prismic\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

export function getEmbeddedPreviewMode() {
  if (window.self === window.top) return;
  if (window.name === pushMarkerWindowName) return 'push';
  if (window.name === pollMarkerWindowName) return 'poll';
}

export class EmbeddedPreviewCookie {
  // Align the site cookie with `ref`. Returns true when the page should reload.
  sync(ref) {
    if (ref === this.getRefForDomain()) return false;

    if (ref) this.upsertPreviewForDomain(ref);
    else this.deletePreviewForDomain();

    return true;
  }

  getRefForDomain() {
    return getCookie(previewCookieName);
  }

  upsertPreviewForDomain(ref) {
    setCookie(previewCookieName, ref);
  }

  deletePreviewForDomain() {
    deleteCookie(previewCookieName);
  }
}

export function setupEmbeddedPreviewPush({ preview }) {
  const startHeightReporting = onceStartDocumentHeightReporting();

  listenToParent(event => {
    if (!isSetRefMessage(event.data)) return;

    preview.updateFromRef(event.data.token).catch(error => {
      console.error('Failed to update embedded preview ref.', error);
    });

    startHeightReporting(event.origin);
  });

  postReadyMessage();
}

// Poll mode gets its ref on its own, so the editor only replies to say it's
// there, which is what reveals its origin to us.
export function setupEmbeddedPreviewPoll() {
  const startHeightReporting = onceStartDocumentHeightReporting();

  listenToParent(event => {
    if (!isTypedMessage(event.data, ackMessageType)) return;

    startHeightReporting(event.origin);
  });

  postReadyMessage();
}

function onceStartDocumentHeightReporting() {
  // The parent origin is only known once it has posted a valid message to us.
  return once(parentOrigin => startDocumentHeightReporting({ parentOrigin }));
}

function listenToParent(handler) {
  window.addEventListener('message', event => {
    if (!isAllowedParentOrigin(event.origin)) return;
    if (event.source !== window.parent) return;

    handler(event);
  });
}

function postReadyMessage() {
  // Safe to broadcast to '*': no data in this message, and both sides
  // validate origins on the messages that follow.
  window.parent.postMessage({ type: readyMessageType }, '*');
}

function isSetRefMessage(data) {
  return (
    isTypedMessage(data, setRefMessageType)
    && typeof data.token === 'string'
    && data.token.length > 0
  );
}

function isTypedMessage(data, type) {
  return Boolean(data) && typeof data === 'object' && data.type === type;
}

function isAllowedParentOrigin(origin) {
  if (!origin) return false;
  return allowedParentOrigins.some(allowedOrigin => allowedOrigin.test(origin));
}
