import Preview from './preview';
import Config from './config';
import Messenger from './messenger';
import { iFrame } from './utils';

let bootstrap;

const PRISMIC_SESSION_REG = /#(([^~]+)~)?prismic-session=([-_a-zA-Z0-9]{16})/;

export default {

  async listen() {
    const updated = await fetch(`${Config.baseURL}/toolbar/bootstrap`).catch(e => false);
    bootstrap = new Messenger(`${Config.baseURL}/toolbar/bootstrap`);

    if (!updated) return legacySetup();

    const ref = (await bootstrap.post('ref')) || null;
    const cookie = Preview.get() || null;

    // need to delete cookie
    if (!ref && cookie) {
      await sessionClose();
      Preview.close();
      window.location.reload();
    }

    // need to set cookie
    if (ref && ref !== cookie) {
      await displayLoading();
      Preview.set(ref);
      window.location.reload();
    }
  },

  close() {
    bootstrap.post('close');
  },

};

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
