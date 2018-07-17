const PRISMIC_ENDPOINT = ((window.prismic && window.prismic.endpoint) || '').replace(/\.cdn/, '');
const matches = PRISMIC_ENDPOINT && PRISMIC_ENDPOINT.match(new RegExp('https?://([^/]*)'));

export default matches ? {
  endpoint: (window.prismic && window.prismic.endpoint),
  baseURL: matches[0],
  editorTab: matches[1],
  location: {
    origin: window.location.origin,
    hash: window.location.hash,
    pathname: window.location.pathname,
    search: window.location.search,
  },
} : {};
