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
  connectToParent(event => {
    if (!isSetRefMessage(event.data)) return;

    preview.updateFromRef(event.data.token, event.data.reload).catch(error => {
      console.error('Failed to update embedded preview ref.', error);
    });
  });
}

export function setupEmbeddedPreviewPoll() {
  connectToParent();
}

function connectToParent(handleMessage = () => {}) {
  const startHeightReporting = once(parentOrigin => startDocumentHeightReporting({ parentOrigin }));

  window.addEventListener('message', event => {
    if (!isAllowedParentOrigin(event.origin)) return;
    if (event.source !== window.parent) return;

    if (isTypedMessage(event.data, ackMessageType)) {
      startHeightReporting(event.origin);
      return;
    }

    handleMessage(event);
  });

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
