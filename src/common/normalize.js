import { parseQuery } from 'common';

export const normalizeDocument = doc => ({
  title: `Title ${doc.id}`,
  summary: `Our goal at Prismic is to build the future of the CMS. All our improvements and features are based on the great ideas of our good leader John Doe. These truths are self-evident, that all men are created equal. Blah blah blah this should be hidden. Blah blah blah this should be hidden. Blah blah blah this should be hidden. Blah blah blah this should be hidden. Blah blah blah this should be hidden.`,
  url: `http://foyer-demo.wroom.test/documents/working`,
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
