import Preview from './preview';
import Config from './config';
import Messenger from './messenger';

const bootstrap = new Messenger(`${Config.baseURL}/toolbar/bootstrap`);
const PRISMIC_SESSION_REG = /#(([^~]+)~)?prismic-session=([-_a-zA-Z0-9]{16})/;

async function listen() {
  // Legacy
  const legacy = !(await fetch(`${Config.baseURL}/toolbar/bootstrap`).then(r => r.text()))
  if (legacy) return legacySetup();

  // Get ref & cookie
  const ref = (await bootstrap.post('ref')) || null;
  const cookie = Preview.get() || null;

  // Need to delete cookie
  if (!ref && cookie) {
    await close();
    Preview.close();
    window.location.reload();
  }

  // Need to set cookie
  if (ref && ref !== cookie) {
    await displayLoading();
    Preview.set(ref);
    window.location.reload();
  }
}

function close() {
  bootstrap.post('close');
}

function displayLoading() {
  return new Promise(resolve => {
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
      window.setTimeout(() => resolve(), 1800);
    }, 200);
  });
}

// TODO LEGACY
async function legacySetup() {
  const { hash } = Config.location;
  const matches = hash.match(PRISMIC_SESSION_REG);
  const sessionId = matches && matches[3];

  if (!sessionId) return;

  await displayLoading();

  const endpoint = `${Config.baseURL}/previews/token/${sessionId}`;

function close() {
  REF_IFRAME.contentWindow.postMessage({ type: 'close' }, '*');
}

function displayLoading() {
  const iframe = await iFrame(`${baseURL}/previews/loading`)

  iframe.style = {
    ...iframe.style,
    position: 'fixed',
    right: 0,
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 2147483000,
    width: '100%',
    height: '100%',
    border: 'none',
    opacity: 0,
    transition: '.5s opacity',
  };

  document.body.appendChild(iframe);

  await wait(1.8);

  iframe.style.opacity = 1;
}

export default { listen, close };
