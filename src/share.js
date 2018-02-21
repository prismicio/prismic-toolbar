import Preview from './preview';

const queryString = require('query-string');

const PRISMIC_SESSION_PARAM = 'prismic-session';

function logError(message) {
  console.error(`[prismic.io] Unable to access to preview session: ${message}`);
}

function listen(config, callback) {
  const qs = queryString.parse(window.location.hash);
  const sessionId = qs[PRISMIC_SESSION_PARAM];
  if (sessionId) {
    const endpoint = `${config.baseURL}/previews/shared/${sessionId}`;
    fetch(endpoint).then((response) => {
      response.json().then((json) => {
        if (json.ref) {
          Preview.close();
          Preview.set(json.ref);
          delete qs[PRISMIC_SESSION_PARAM];
          const maybeHash = queryString.stringify(qs);
          const hash = maybeHash ? `#${maybeHash}` : '';
          const url = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
          document.location = url;
        } else {
          logError("Session id isn't valid");
          callback();
        }
      }).catch(() => {
        logError('Invalid server response');
        callback();
      });
    }).catch(() => {
      logError('Invalid server response');
      callback();
    });
  } else {
    callback();
  }
}

export default {
  listen,
};
