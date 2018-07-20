import { parseQuery } from 'common';

export const normalizeDocument = doc => ({
  doc,
  title: doc.metadata.title,
  summary: doc.metadata.description || 'No summary available.',
  url: `${window.location.origin}/app/documents/${doc.id}/ref`,
});

export const normalizeDraft = draft =>
  Object.assign(
    {
      title: null,
      summary: null,
      url: null,
    },
    draft || {}
  );

// Parse Toolbar Bootstrap state
export const normalizeState = _state => {
  const state = {};
  state.csrf = _state.csrf || null;
  state.guest = _state.isGuest;
  state.auth = _state.isAuthenticated;
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
      .filter(Boolean)
      .map(normalizeDraft);

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
