import { fetchy, query, getCookie, demolishCookie, wait, throttle, memoize } from 'common';
import { state, messenger } from './utils';

// Check for new preview ref
let newRef = null;
const fetcher = throttle(async _ => {
  const s = await state()
  const ref = encodeURIComponent(s.preview.ref);
  return fetchy({ url: `/previews/${sessionId}/ping?ref=${ref}` });
}, 2000);

export const newPreviewRef = async _ => {
  while (true) {
    if (newRef) return newRef;
    const { reload, ref } = await fetcher();
    if (reload) newRef = ref;
    if (newRef) return newRef;
    await wait(3);
  }
};

// Session id
const sessionId = getCookie('io.prismic.previewSession');

// Close preview session
export const closePreview = _ => demolishCookie('io.prismic.previewSession');

// Share
export const sharePreview = memoize(async location => {
  const imageId = location.pathname.slice(1) + location.hash + sessionId + '.jpg';
  const imageName = imageId
  const session = await getShareableSession({ location, imageName });
  if (!session.hasPreviewImage) uploadScreenshot(imageName);
  return session.url;
}, ({ href }) => href);

// Get shareable session
const getShareableSession = async ({ location, imageName }) => {
  const s = await state()
  const qs = query({
    sessionId,
    pageURL: location.href,
    title: s.preview.title,
    imageName,
    _: s.csrf,
  });

  return fetchy({
    url: `/previews/s?${qs}`,
    method: 'POST',
  });
};

// Upload screenshot
const uploadScreenshot = async imageName => {
  // ACL
  const acl = await fetchy({
    url: `/previews/${sessionId}/acl`,
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
  body.append('file', await messenger.post('screenshot'));

  // Upload
  return fetch(acl.url, { method: 'POST', body });
};
