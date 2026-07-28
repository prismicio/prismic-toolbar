import { once } from '@common';
import { startDocumentHeightReporting } from './document-height';

const markerParam = 'prismic_embed_preview';

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
  return (
    window.self !== window.top
    && new URLSearchParams(window.location.search).get(markerParam) === 'true'
  );
}

export function setupEmbeddedPreview({ preview }) {
  const startHeightReporting = once(parentOrigin => startDocumentHeightReporting({ parentOrigin }));

  window.addEventListener('message', event => {
    if (!isAllowedParentOrigin(event.origin)) return;
    if (!isSetRefMessage(event.data)) return;

    preview.updateFromRef(event.data.token).catch(error => {
      console.error('Failed to update embedded preview ref.', error);
    });

    // The parent origin is only known once it has posted a valid message to us.
    startHeightReporting(event.origin);
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
