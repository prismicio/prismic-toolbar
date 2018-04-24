import Preview from './preview';
import Config from './config';
import Utils from './utils';

const REF_IFRAME = Utils.iFrame(`${Config.baseURL}/previews/messenger`);

function logError(message) {
  console.error(`[prismic.io] Unable to access to preview session: ${message}`); // eslint-disable-line
}

const PRISMIC_SESSION_REG = /#(([^~]+)~)?prismic-session=([-_a-zA-Z0-9]{16})/;

function displayLoading(callback) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', `${Config.baseURL}/previews/loading`);
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

function listen(callback) {
  if (Config.location.hash.match(PRISMIC_SESSION_REG)) return legacySetup(callback);

  // from ref iframe
  function setRef(msg) {
    if (msg.data.type !== 'previewRef') return;
    window.removeEventListener('message', setRef);
    const ref = msg.data.data;
    if (!ref) return callback();
    if (ref === Preview.get()) return callback();
    displayLoading(() => {
      Preview.set(ref);
      window.location.reload();
    });
  }
  return window.addEventListener('message', setRef);
}

// TODO remove
function legacySetup(callback) {
  const { hash } = Config.location;
  const matches = hash.match(PRISMIC_SESSION_REG);
  const sessionId = matches && matches[3];

  if (sessionId) {
    displayLoading(() => {
      const endpoint = `${Config.baseURL}/previews/token/${sessionId}`;
      fetch(endpoint).then(response => {
        response.json().then(json => {
          if (json.ref) {
            Preview.close();
            Preview.set(json.ref);
            const updatedHash = hash.replace(PRISMIC_SESSION_REG, '$2');
            const href = `${Config.location.origin}${Config.location.pathname}${Config.location.search}${updatedHash ? `#${updatedHash}` : ''}`;
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

function close() {
  REF_IFRAME.contentWindow.postMessage({ type: 'close' }, '*');
}

export default {
  listen,
  close,
};
