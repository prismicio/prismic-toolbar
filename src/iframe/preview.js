import { fetchy, query, getCookie, deleteCookie, wait, throttle } from 'common';
import { state, messenger } from './config';

// Check for new preview ref
let newRef = null;
const fetcher = throttle(() => {
  const ref = encodeURIComponent(state.preview.ref);
  return fetchy({ url: `/previews/${sessionId}/ping?ref=${ref}` });
}, 2000);

const newPreviewRef = async () => {
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
const closePreview = () => deleteCookie('io.prismic.previewSession');

// Share
const share = async location => {
  const imageId = location.pathname.slice(1) + location.hash + sessionId + '.jpg';
  const imageName = encodeURIComponent(imageId); // check this
  const session = await getShareableSession({ location, imageName });
  if (!session.hasPreviewImage) uploadScreenshot(imageName);
  return session.url;
};

// Get shareable session
const getShareableSession = ({ location, imageName }) => {
  const qs = query({
    sessionId,
    pageURL: location.href,
    title: state.preview.title,
    imageName,
    _: state.csrf,
  });

  return fetchy({
    url: `/previews/s?${qs}`,
    method: 'POST',
    credentials: 'same-origin',
  });
};

// Upload screenshot
const uploadScreenshot = async imageName => {
  // ACL
  const acl = await fetchy({
    url: `/previews/${sessionId}/acl`,
    credentials: 'same-origin',
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

// Export
export const preview = {
  share,
  newPreviewRef,
  closePreview,
};
