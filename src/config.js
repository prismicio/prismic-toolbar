const PRISMIC_ENDPOINT = ((window.prismic && window.prismic.endpoint) || '').replace(/\.cdn/, '');
const matches = PRISMIC_ENDPOINT && PRISMIC_ENDPOINT.match(new RegExp('https?://([^/]*)'));
const baseURL = matches[0];
const cdnBaseURL = baseURL && enforceCDN(baseURL);

function enforceCDN(url) {
  const reg = /^(https?:\/\/)(.+?)[.](cdn)?(.+?)$/;
  return url.replace(reg, (_, protocol, domain, cdn, platform) => (
    `${protocol}${domain}.${cdn || 'cdn.'}${platform}`
  ));
}

export default matches ? {
  endpoint: (window.prismic && window.prismic.endpoint),
  baseURL,
  cdnBaseURL,
  editorTab: matches[1],
  location: {
    origin: window.location.origin,
    hash: window.location.hash,
    pathname: window.location.pathname,
    search: window.location.search,
    href: window.location.href,
  },
} : {};
