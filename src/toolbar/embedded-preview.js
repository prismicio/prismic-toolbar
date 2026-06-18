const markerParam = 'prismic_embed_preview';
const debugParam = 'prismic_embed_preview_debug';

const setRefMessageType = 'prismic:embedded-preview:set-ref';
const readyMessageType = 'prismic:embedded-preview:ready';
const timingMessageType = 'prismic:embedded-preview:timing';
const softRefreshRenderedEventType = 'prismic:embedded-preview:soft-refresh-rendered';

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

  let parentOrigin;
  let lastRefreshId;
  let currentTiming;

  window.addEventListener('message', event => {
    if (!isAllowedParentOrigin(event.origin)) return;
    if (!isSetRefMessage(event.data)) return;

    parentOrigin = event.origin;

    const timing = Object.assign({}, event.data.timing || {}, {
      iframeReceivedAt: Date.now(),
    });

    if (lastRefreshId === event.data.refreshId) return;
    lastRefreshId = event.data.refreshId;

    const nextTiming = Object.assign({}, timing, {
      iframeSoftRefreshRequestedAt: Date.now(),
    });
    currentTiming = nextTiming;

    preview.updateFromRef(event.data.token).catch(error => {
      console.error('Failed to update embedded preview ref.', error);
    });
  });
  window.addEventListener(softRefreshRenderedEventType, event => {
    const renderedRefreshId = event.detail && typeof event.detail.refreshId === 'string'
      ? event.detail.refreshId
      : lastRefreshId;

    if (!renderedRefreshId || renderedRefreshId !== lastRefreshId || !currentTiming) {
      return;
    }

    currentTiming = Object.assign({}, currentTiming, {
      iframeSoftRefreshRenderedAt: Date.now(),
    });

    reportTiming({
      parentOrigin,
      stage: 'iframe-soft-refresh-rendered',
      timing: currentTiming,
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
    && (
      data.timing === undefined
      || (typeof data.timing === 'object' && data.timing !== null)
    )
  );
}

function isAllowedParentOrigin(origin) {
  if (!origin) return false;

  return allowedParentOrigins.some(allowedOrigin => {
    if (typeof allowedOrigin === 'string') return allowedOrigin === origin;
    return allowedOrigin.test(origin);
  });
}

function reportTiming({ parentOrigin, stage, timing }) {
  if (!shouldReportTiming(parentOrigin)) return;

  window.parent.postMessage({
    type: timingMessageType,
    stage,
    timing,
  }, parentOrigin);
}

function shouldReportTiming(parentOrigin) {
  return (
    parentOrigin
    && isAllowedParentOrigin(parentOrigin)
    && new URLSearchParams(window.location.search).get(debugParam) === 'true'
  );
}
