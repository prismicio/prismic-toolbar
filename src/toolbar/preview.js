import { fetchy, query, getCookie, deleteCookie, slugify } from 'common';

// Export
export const preview = state => ({ closePreview, screenshot, share: share(state) });

// Session id
const sessionId = getCookie('io.prismic.previewSession');

// Close preview session
const closePreview = () => deleteCookie('io.prismic.previewSession');

// Screenshot
let resolveScreenshot;
const futureScreenshot = new Promise(resolve => (resolveScreenshot = resolve));
const screenshot = img => resolveScreenshot(img);

// Share
const share = state => async location => {
  const imagePath = location.pathname.slice(1);
  const imageName = slugify(`${imagePath}${location.hash}$-${sessionId}.jpg`);
  const session = await getShareableSession({ location, state, imageName });
  if (!session.hasPreviewImage) uploadScreenshot(imageName);
  return session.url;
};

// Get shareable session
const getShareableSession = ({ location, state, imageName }) => {
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
const uploadScreenshot = async iamgeName => {
  // ACL
  const acl = await fetchy({
    url: `/previews/${sessionId}/acl`,
    credentials: 'same-origin',
  });

  // Form
  const form = new FormData();
  form.append('key', `${acl.directory}/${imageName}`);
  form.append('AWSAccessKeyId', acl.key);
  form.append('acl', 'public-read');
  form.append('policy', acl.policy);
  form.append('signature', acl.signature);
  form.append('Content-Type', 'image/png');
  form.append('Cache-Control', 'max-age=315360000');
  form.append('Content-Disposition', `inline; filename=${imageName}`);
  form.append('file', await futureScreenshot);

  // Upload
  return fetchy({
    url: acl.url,
    method: 'POST',
    body: form,
  });
};
