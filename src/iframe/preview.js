import { fetchy, query, getCookie, demolishCookie, throttle, memoize, once } from '@common';

const SESSION_ID = getCookie('io.prismic.previewSession');

// Close preview session
function closePreviewSession () /* void */{
  demolishCookie('io.prismic.previewSession');
}

const PreviewRef = {
  getCurrent: throttle(async () => {
    const s = await State.get();
    const ref = encodeURIComponent(s.preview.ref);
    return fetchy({ url: `/previews/${SESSION_ID}/ping?ref=${ref}` });
  }, 2000)
};

const Share = {
  run: memoize(async location => {
    const imageId = location.pathname.slice(1) + location.hash + SESSION_ID + '.jpg';
    const imageName = imageId;
    const session = await this.getSession({ location, imageName });
    if (!session.hasPreviewImage) this.uploadScreenshot(imageName);
    return session.url;
  }, ({ href }) => href),

  async getSession({ location, imageName }) {
    const s = await State.get();
    const qs = query({
      sessionId: SESSION_ID,
      pageURL: location.href,
      title: s.preview.title,
      imageName,
      _: s.csrf,
    });

    return fetchy({
      url: `/previews/s?${qs}`,
      method: 'POST',
    });
  },

  async uploadScreenshot(imageName) {
    const acl = await fetchy({
      url: `/previews/${SESSION_ID}/acl`,
    });

    // Form
    const body = new FormData();
    body.append('key', `${acl.directory}/${imageName}`);
    body.append('AWSAccessKeyId', acl.key);
    body.append('acl', 'public-read');
    body.append('policy', acl.policy);
    body.append('signature', acl.signature);
    body.append('Content-Type', 'image/png');
    body.append('Cache-Control', 'max-age=315360000');
    body.append('Content-Disposition', `inline; filename=${imageName}`);
    body.append('file', await (await messengerF).post('screenshot'));

    // Upload
    return fetch(acl.url, { method: 'POST', body });
  }
};

const State = {
  liveStateNeeded: Boolean(getCookie('is-logged-in')) || Boolean(getCookie('io.prismic.previewSession')),

  get: once(async () => {
    if (!this.liveStateNeeded) return this.normalize();
    return fetchy({
      url: '/toolbar/state',
    }).then(normalizeState);
  }),

  normalize: (_state = {}) => {
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
  }
};

export default {
  getState: State.get,
  share: Share.run,
  close: closePreviewSession,
  getCurrentRef: PreviewRef.getCurrent
};
