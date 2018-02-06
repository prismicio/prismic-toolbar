import coookies from './coookies';
const queryString = require('query-string');

const PRISMIC_SESSION_PARAM = 'prismic-session';

function listen(config) {
  return new Promise((resolve) => {
    const qs = queryString.parse(window.location.hash);
    const sessionId = qs[PRISMIC_SESSION_PARAM];
    if (sessionId) {
      const endpoint = `${config.baseURL}/previews/shared/${sessionId}`;
      fetch(endpoint).then((response) => {
        response.json().then((json) => {
          if (json.ref) {
            coookies.setPreviewToken(json.ref);
            delete qs[PRISMIC_SESSION_PARAM];
            const maybeHash = queryString.stringify(qs);
            const hash = maybeHash ? `#${maybeHash}` : '';
            const url = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
            document.location = url;
            resolve(url);
          } else {
            resolve();
          }
        }).catch(() => resolve());
      }).catch(() => resolve());
    } else {
      resolve();
    }
  });
}

export default {
  listen,
};
