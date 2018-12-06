// Reload original page URL
const { href } = window.location;
export const reloadOrigin = _ => require('common').reload(href);

// Validate an endpoint
const validEndpoint = repo => Boolean(repo) && !/[^-a-zA-Z0-9\.]/.test(repo);

// Get window.prismic.endpoint
export const getLegacyEndpoint = _ => {
  return new URL(window.prismic.endpoint).hostname.replace('.cdn', '')
}

// Parse an endpoint
export const parseEndpoint = repo => {
  if (!validEndpoint(repo)) return null
  if (!repo.includes('.')) repo = `${repo}.prismic.io`
  return repo;
}