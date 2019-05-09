import { createMessenger, fetchy, getCookie, once } from 'common';

// Only fetch if live state is needed
const liveStateNeeded = Boolean(getCookie('is-logged-in')) || Boolean(getCookie('io.prismic.previewSession'));

// State (memoized)
const getState = once(async _ => {
  if (!liveStateNeeded) return normalizeState();
  return fetchy({
    url: `/toolbar/state`,
  }).then(normalizeState);
});

// Preview state (derived from memoized state)
const preview = _ => getState().then(s => s.preview);

// Screenshot
const messengerF = createMessenger(window.parent);

export { isPrismicUser, getState as state, preview, messengerF };

// Normalize toolbar state
const normalizeState = (_state = {}) => {
  const state = {};
  state.csrf = _state.csrf || null;
  state.auth = Boolean(_state.isAuthenticated);
  state.preview = _state.previewState || null;

  if (state.preview) {
    const old = state.preview;
    const p = {};

    p.ref = old.ref;
    p.title = old.title;
    p.updated = old.lastUpdate;
    p.documents = []
      .concat(old.draftPreview)
      .concat(old.releasePreview)
      .filter(Boolean);

    state.preview = p;
  }

  return state;
};