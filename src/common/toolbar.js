const { origin } = window.location;

export const normalizeDocument = doc => ({
  ...doc,
  url: `${origin}/app/documents/${doc.id}/ref`,
});

// Parse Toolbar Bootstrap state
export const normalizeState = (_state = {}) => {
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