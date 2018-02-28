import Preview from './preview';

function logError(message) {
  console.error(`[prismic.io] Unable to access to preview session: ${message}`);
}

const PRISMIC_SESSION_REG = /#(([^~]+)~)?prismic-session=([-_a-zA-Z0-9]{16})/;

function displayLoading(config, callback) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', `${config.baseURL}/previews/loading`);
  iframe.style.position = 'fixed';
  iframe.style.right = 0;
  iframe.style.left = 0;
  iframe.style.top = 0;
  iframe.style.bottom = 0;
  iframe.style['z-index'] = 2147483000;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.opacity = 0;
  iframe.style.transition = '.5s opacity';
  document.body.appendChild(iframe);
  window.setTimeout(() => {
    iframe.style.opacity = 1;
    window.setTimeout(() => callback(), 1800);
  }, 200);
}

function listen(config, callback) {
  const hash = window.location.hash;
  const matches = hash.match(PRISMIC_SESSION_REG);
  const sessionId = matches && matches[3];

  if (sessionId) {
    displayLoading(config, () => {
      const endpoint = `${config.baseURL}/previews/token/${sessionId}`;
      fetch(endpoint).then((response) => {
        response.json().then((json) => {
          if (json.ref) {
            Preview.close();
            Preview.set(json.ref);
            const updatedHash = hash.replace(PRISMIC_SESSION_REG, '$2');
            if (updatedHash) {
              window.location.hash = updatedHash;
              window.location.reload();
            } else {
              const href = `${window.location.origin}${window.location.pathname}${window.location.search}${updatedHash}`;
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
    });
  } else callback();
}

export default {
  listen,
};
