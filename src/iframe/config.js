import { normalizeState, Messenger, fetchy, getCookie, once } from 'common';

// Only fetch if live state is needed
const liveStateNeeded = Boolean(getCookie('is-logged-in')) || Boolean(getCookie('io.prismic.previewSession'));

// State (memoized)
  const getState = once(async _ => {
  if (!liveStateNeeded) return normalizeState();
  return fetchy({
    url: `/toolbar/state`, // TODO doesn't send cookies in IE
    credentials: 'same-origin',
  }).then(normalizeState);
});

// Preview state (derived from memoized state)
const preview = _ => getState().then(s => s.preview);

// Screenshot
const messenger = new Messenger(window.parent);

export { isPrismicUser, getState as state, preview, messenger };
