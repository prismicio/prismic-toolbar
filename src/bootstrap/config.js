const PRISMIC_ENDPOINT = ((window.prismic && window.prismic.endpoint) || '').replace(/\.cdn/, '');
const matches = PRISMIC_ENDPOINT ? PRISMIC_ENDPOINT.match(new RegExp('https?://([^/]*)')) : [];

export const endpoint = window.prismic.endpoint || null;
export const baseURL = matches[0] || null;
export const editorTab = matches[1] || null;
