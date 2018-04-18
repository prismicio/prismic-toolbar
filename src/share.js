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
  if (config.location.hash.match(PRISMIC_SESSION_REG)) return legacySetup(config, callback)

  // from corsLink
  function setRef(msg) {
    if (msg.data.type !== 'previewRef') return
    window.removeEventListener('message', setRef)
    const ref = msg.data.data
    if (!ref) return callback()
    if (ref === Preview.get()) return callback()
    displayLoading(config, () => {
      Preview.set(ref)
      window.location.reload()
    })
  }
  window.addEventListener('message', setRef)
}

// TODO remove
function legacySetup() {
  const hash = config.location.hash;
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
            const href = `${config.location.origin}${config.location.pathname}${config.location.search}${updatedHash ? `#${updatedHash}` : ''}`;
            window.location.href = href;
            if (updatedHash) {
              window.location.reload();
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

function iFrame(src) {
  const iframe = document.createElement('iframe')
  iframe.src = src
  document.head.appendChild(iframe)
  return iframe
}
