import Utils from './utils';

const PRISMIC_ENDPOINT = ((window.prismic && window.prismic.endpoint) || '').replace(/\.cdn\.prismic\.io/, '.prismic.io');
const matches = PRISMIC_ENDPOINT && PRISMIC_ENDPOINT.match(new RegExp('https?://([^/]*)'));

export default matches ? {
  baseURL: matches[0],
  editorTab: matches[1],
  corsLink: Utils.iFrame(`${matches[0]}/previews/messenger`),
  location: {
    origin: window.location.origin,
    hash: window.location.hash,
    pathname: window.location.pathname,
    search: window.location.search,
  },
} : {};
