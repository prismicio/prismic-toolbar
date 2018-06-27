import Preview from './preview';
import Config from './config';
import Messenger from './messenger';
import { parseRef } from './helpers';

let bootstrap;
const PRISMIC_SESSION_REG = /#(([^~]+)~)?prismic-session=([-_a-zA-Z0-9]{16})/;

async function listen() {
  bootstrap = new Messenger(`${Config.baseURL}/toolbar/bootstrap`);

  // Legacy
  const legacy = !(await fetch(`${Config.baseURL}/toolbar/bootstrap`).then(r => r.text()))
  if (legacy) return legacySetup();

  // Get ref & cookie
  let ref = parseRef(await bootstrap.post('ref'));
  const cookie = parseRef(Preview.get());

  // Need to delete cookie
  if (!ref && cookie) {
    await close();
    Preview.close();
    window.location.reload();
  }

  // Need to set cookie NOTE don't refresh if different ?id
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

  const json = await fetch(endpoint).then(res => res.json());

  if (!json.ref) return;

  Preview.close();
  Preview.set(json.ref);
  const updatedHash = hash.replace(PRISMIC_SESSION_REG, '$2');
  const href = `${Config.location.origin}${Config.location.pathname}${Config.location.search}${updatedHash ? `#${updatedHash}` : ''}`;
  window.location.href = href;
  if (updatedHash) window.location.reload();
}

export default { listen, close };
