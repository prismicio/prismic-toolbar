const markerParam = 'prismic_embed_preview';

const setRefMessageType = 'prismic:embedded-preview:set-ref';
const readyMessageType = 'prismic:embedded-preview:ready';

const allowedParentOrigins = [
  /^https:\/\/([^/]+\.)?prismic\.io$/,
  /^https:\/\/([^/]+\.)?wroom\.com$/,
  'https://marketing-tools-wroom.com',
  'http://localhost:5173',
];

export function isEmbeddedPreview() {
  return (
    window.self !== window.top
    && new URLSearchParams(window.location.search).get(markerParam) === 'true'
  );
}

export function setupEmbeddedPreview({ preview }) {
  if (!isEmbeddedPreview()) return;

  let lastRefreshId;

  window.addEventListener('message', event => {
    if (!isAllowedParentOrigin(event.origin)) return;
    if (!isSetRefMessage(event.data)) return;

    if (lastRefreshId === event.data.refreshId) return;
    lastRefreshId = event.data.refreshId;

    preview.updateFromRef(event.data.token).catch(error => {
      console.error('Failed to update embedded preview ref.', error);
    });
  });

  announceReady();

  function announceReady() {
    window.parent.postMessage({ type: readyMessageType }, '*');
  }
}

function isSetRefMessage(data) {
  return (
    data
    && typeof data === 'object'
    && data.type === setRefMessageType
    && typeof data.token === 'string'
    && typeof data.documentId === 'string'
    && typeof data.versionId === 'string'
    && typeof data.refreshId === 'string'
  );
}

function isAllowedParentOrigin(origin) {
  if (!origin) return false;

  return allowedParentOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') return allowedOrigin === origin;
    return allowedOrigin.test(origin);
  });
}
