import { deleteCookie, getCookie, setCookie } from '@common';

const pushMarkerWindowName = 'prismic:embedded-preview';
const pollMarkerWindowName = 'prismic:embedded-preview:poll';
const previewCookieName = 'io.prismic.preview';

const setRefMessageType = 'prismic:embedded-preview:set-ref';
const readyMessageType = 'prismic:embedded-preview:ready';

const allowedParentOrigins = [
  /^https:\/\/([^/]+\.)?prismic\.io$/,
  /^https:\/\/([^/]+\.)?wroom\.io$/,
  /^https:\/\/([^/]+\.)?dev-tools-wroom\.com$/,
  /^https:\/\/([^/]+\.)?marketing-tools-wroom\.com$/,
  /^https:\/\/([^/]+\.)?platform-wroom\.com$/,
  /^https:\/\/([^/]+\.)?devops-wroom\.com$/,
  /^https:\/\/[a-z0-9-]+-prismic\.vercel\.app$/,
];

const devParentOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

export function isEmbeddedPreview() {
  return Boolean(getEmbeddedPreviewMode());
}

export function getEmbeddedPreviewMode() {
  if (window.self === window.top) return;
  if (window.name === pushMarkerWindowName) return 'push';
  if (window.name === pollMarkerWindowName) return 'poll';
}

export class EmbeddedPreviewCookie {
  init(ref) {
    if (ref === this.getRefForDomain()) return { convertedLegacy: false };

    if (ref) this.upsertPreviewForDomain(ref);
    else this.deletePreviewForDomain();

    return { convertedLegacy: false };
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
  window.addEventListener('message', event => {
    if (!isAllowedParentOrigin(event.origin)) return;
    if (event.source !== window.parent) return;
    if (!isSetRefMessage(event.data)) return;

    preview.updateFromRef(event.data.token).catch(error => {
      console.error('Failed to update embedded preview ref.', error);
    });
  });

  // Safe to broadcast to '*': no data in this message, and both sides
  // validate origins on the ref messages that follow.
  window.parent.postMessage({ type: readyMessageType }, '*');
}

function isSetRefMessage(data) {
  return (
    data
    && typeof data === 'object'
    && data.type === setRefMessageType
    && typeof data.token === 'string'
    && data.token.length > 0
  );
}

function isAllowedParentOrigin(origin) {
  if (!origin) return false;

  const allowed = [
    ...allowedParentOrigins,
    ...(isEmbeddedPreview() ? devParentOrigins : []),
  ];

  return allowed.some(allowedOrigin => allowedOrigin.test(origin));
}
