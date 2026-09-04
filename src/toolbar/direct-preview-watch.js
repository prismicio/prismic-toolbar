import { deleteCookie, getCookie, setCookie, toolbarEvents, dispatchToolbarEvent } from '@common';
import { reloadOrigin } from './utils';

export const DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE = 'io.prismic.preview.updated';
export const DIRECT_PREVIEW_REF_WATCH_INTERVAL = 250;

const previewCookieName = 'io.prismic.preview';

export function markDirectPreviewRefUpdated({ repository, ref }) {
  setCookie(
    DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE,
    { version: 2, repository, ref },
    // Session lifetime: an idle editor must not hand ownership to a stale legacy
    // preview after an arbitrary timeout. A new ref or exit invalidates this marker.
    null
  );
}

export function clearDirectPreviewRef() {
  deleteCookie(DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE);
}

// Parse only our protocol metadata; the preview ref itself remains opaque.
export function getDirectPreviewState(readCookie = getCookie) {
  const marker = readCookie(DIRECT_PREVIEW_REF_UPDATE_MARKER_COOKIE);
  if (!marker) return;

  try {
    const state = JSON.parse(marker);
    if (
      state && state.version === 2
      && typeof state.repository === 'string' && state.repository.length > 0
      && typeof state.ref === 'string' && state.ref.length > 0
      && state.ref === readCookie(previewCookieName)
    ) return state;
  } catch (error) {
    // Old or stale markers do not claim a regular preview session.
  }
}

export function createDirectPreviewRefWatcher({
  repository,
  readCookie = getCookie,
  emitToolbarEvent = dispatchToolbarEvent,
  reload = reloadOrigin,
} = {}) {
  const startupState = getDirectPreviewState(readCookie);
  let lastSeenRef = startupState && startupState.repository === repository
    ? startupState.ref
    : undefined;
  let isStartup = true;

  return function watchDirectPreviewRef() {
    const state = getDirectPreviewState(readCookie);
    const ref = state && state.repository === repository ? state.ref : undefined;
    const reconcileStartup = isStartup && ref && ref === lastSeenRef;
    isStartup = false;

    if (!ref) {
      const ended = lastSeenRef && !readCookie(previewCookieName);
      lastSeenRef = undefined;
      if (ended) {
        clearStartupReload(repository);
        if (emitToolbarEvent(toolbarEvents.previewEnd)) reload();
      }
      return;
    }
    if (ref === lastSeenRef && !reconcileStartup) return;

    lastSeenRef = ref;
    // The toolbar can load after SSR and after the cookie changed. Reconcile
    // once on startup; cookie equality cannot prove what the page rendered.
    if (
      emitToolbarEvent(toolbarEvents.previewUpdate, { ref })
      && prepareReload({ repository, ref, reconcileStartup })
    ) reload();
  };
}

function prepareReload({ repository, ref, reconcileStartup }) {
  try {
    const key = `io.prismic.preview.reloaded.${repository}`;
    const value = JSON.stringify([window.location.href, ref]);
    if (reconcileStartup && window.sessionStorage.getItem(key) === value) return false;
    // A generic site has no soft-update listener. Remember its startup reload
    // in this tab so the next page load cannot enter a reload loop.
    window.sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    // Without storage only subsequent changes can safely hard reload.
    return !reconcileStartup;
  }
}

function clearStartupReload(repository) {
  try {
    window.sessionStorage.removeItem(`io.prismic.preview.reloaded.${repository}`);
  } catch (error) {
    // Session storage can be unavailable in restrictive browser settings.
  }
}

export function setupDirectPreviewRefWatcher(options) {
  return window.setInterval(
    createDirectPreviewRefWatcher(options),
    DIRECT_PREVIEW_REF_WATCH_INTERVAL
  );
}
