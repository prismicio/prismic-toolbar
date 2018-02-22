import Preview from './preview';

function logError(message) {
  console.error(`[prismic.io] Unable to access to preview session: ${message}`);
}

const PRISMIC_SESSION_REG = /#(([^~]+)~)?prismic-session=([-_a-zA-Z0-9]{16})/;

function listen(config, callback) {
  const hash = window.location.hash;
  const matches = hash.match(PRISMIC_SESSION_REG);
  const sessionId = matches && matches[3];
  if (sessionId) {
    const endpoint = `${config.baseURL}/previews/token/${sessionId}`;
    fetch(endpoint).then((response) => {
      response.json().then((json) => {
        if (json.ref) {
          Preview.close();
          Preview.set(json.ref);
          const updatedHash = hash.replace(PRISMIC_SESSION_REG, '$2');
          window.location.hash = updatedHash;
          if (updatedHash) {
            window.location.reload();
          } else {
            const href = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
            window.location.href = href;
          }
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
  } else callback();
}

export default {
  listen,
};
