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
  if (!isEmbeddedPreview()) return;

  window.addEventListener('message', event => {
    if (!isAllowedParentOrigin(event.origin)) return;
    if (!isSetRefMessage(event.data)) return;
    // An empty token would end the session and hard-reload the iframe
    if (!event.data.token) return;

    preview.updateFromRef(event.data.token).catch(error => {
      console.error('Failed to update embedded preview ref.', error);
    });
  });

  announceReady();

  function announceReady() {
    // Safe to broadcast to '*': no data in this message, and both sides
    // validate origins on the ref messages that follow.
    window.parent.postMessage({ type: readyMessageType }, '*');
  }
}

function isSetRefMessage(data) {
  return (
    data
    && typeof data === 'object'
    && data.type === setRefMessageType
    && typeof data.token === 'string'
  );
}

function isAllowedParentOrigin(origin) {
  if (!origin) return false;

  const isLocalToolbar = isLocalOrigin(window.location.origin);
  const allowed = isLocalToolbar
    ? [...allowedParentOrigins, ...devParentOrigins]
    : allowedParentOrigins;

  return allowed.some(allowedOrigin => allowedOrigin.test(origin));
}

function isLocalOrigin(origin) {
  return devParentOrigins.some(devOrigin => devOrigin.test(origin));
}
