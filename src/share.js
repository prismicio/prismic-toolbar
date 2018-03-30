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

function getCookie(name) {
    var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? v[2] : null;
}

function listen(config, callback) {
  if (window.prismicSession && !sessionStorage.getItem('sessionHandled')) {
    sessionStorage.setItem('sessionHandled', true)
    displayLoading(config, _ => { // show prismic loader
      fetch(`${config.baseURL}/previews/token/${window.prismicSession}`).then(response => { // see if updated content from wroom
          response.json().then(json => {
              if (json.ref) { // if so
                  Preview.close(); // clear preview cookies?
                  Preview.set(json.ref); // add new cookie
                  window.location.reload(); // reload page
              } else { logError("Session id isn't valid");callback(); }
          }).catch(_ => { logError('Invalid server response');callback(); });
      }).catch(_ => { logError('Invalid server response');callback(); });
    });
  }
  else callback();
}

export default {
  listen,
};
