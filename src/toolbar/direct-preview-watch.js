import { getCookie, setCookie, toolbarEvents, dispatchToolbarEvent } from '@common';

export const DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE = 'io.prismic.preview.updated';
export const DIRECT_PREVIEW_REF_UPDATE_MARKER_VALUE = 'v1';
export const DIRECT_PREVIEW_REF_UPDATE_MARKER_EXPIRES_DAYS = 1 / 24;
export const DIRECT_PREVIEW_REF_WATCH_INTERVAL = 250;

const previewCookieName = 'io.prismic.preview';

export function markDirectPreviewRefUpdated() {
  setCookie(
    DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE,
    DIRECT_PREVIEW_REF_UPDATE_MARKER_VALUE,
    DIRECT_PREVIEW_REF_UPDATE_MARKER_EXPIRES_DAYS
  );
}

export function createDirectPreviewRefWatcher({
  readCookie = getCookie,
  emitToolbarEvent = dispatchToolbarEvent,
} = {}) {
  let hasLastSeenRef = false;
  let lastSeenRef;

  if (readCookie(DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE)) {
    const startupRef = readCookie(previewCookieName);
    if (startupRef) {
      lastSeenRef = startupRef;
      hasLastSeenRef = true;
    }
  }

  return function watchDirectPreviewRef() {
    const marker = readCookie(DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE);
    const ref = readCookie(previewCookieName);

    if (!marker || !ref) return;
    if (hasLastSeenRef && ref === lastSeenRef) return;

    lastSeenRef = ref;
    hasLastSeenRef = true;
    emitToolbarEvent(toolbarEvents.previewUpdate, { ref });
  };
}

export function setupDirectPreviewRefWatcher() {
  return window.setInterval(
    createDirectPreviewRefWatcher(),
    DIRECT_PREVIEW_REF_WATCH_INTERVAL
  );
}
