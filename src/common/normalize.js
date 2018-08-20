import { parseQuery } from 'common';

const { origin } = window.location;

export const normalizeDocument = doc => ({
  doc,
  title: doc.title,
  summary: doc.summary || 'No summary available.',
  url: `${origin}/app/documents/${doc.id}/ref`,
});

// Parse Toolbar Bootstrap state
export const normalizeState = _state => {
  const state = {};
  state.csrf = _state.csrf || null;
  state.guest = _state.isGuest;
  state.auth = Boolean(_state.isAuthenticated);
  state.master = _state.masterRef;
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

// Parse Prismic ref
export const normalizeRef = _ref => {
  let ref = _ref || null;
  if (ref) ref = ref.split('?')[0] || null;
  return {
    ref,
    url: null,
    track: null,
    breaker: null,
    ...parseQuery(_ref),
  };
};
