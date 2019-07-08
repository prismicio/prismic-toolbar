// Reload original page URL
export const reloadOrigin = () => window.location.reload();

// Validate an endpoint
const validEndpoint = repo => Boolean(repo) && !/[^-a-zA-Z0-9.]/.test(repo);

// Get window.prismic.endpoint
export const getLegacyEndpoint = () => {
  try {
    return new URL(window.prismic.endpoint).hostname.replace('.cdn', '');
  } catch (e) {
    return window.prismic.endpoint;
  }
};

// Parse an endpoint
export const parseEndpoint = repo => {
  if (!validEndpoint(repo)) return null;
  if (!repo.includes('.')) repo = `${repo}.prismic.io`;
  return repo;
};

// Get absolute URL
let a;
export const getAbsoluteURL = url => {
  if (!a) a = document.createElement('a');
  a.href = url;
  return a.href;
};
