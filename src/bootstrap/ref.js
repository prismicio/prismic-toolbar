import { Messenger, iFrame, wait, normalizeRef } from '../common';
import { preview } from './cookies';
import { baseURL } from './config';

export class Ref {
  constructor(state) {
    // visitor (csrf empty)
    // authorized
    // preview { ref, title, summary, sessionId?, csrf?, label? }
  }
}

/*
async function start() {
  // Get ref & cookie
  const ref = (await bootstrap.post('ref')) || null;
  const cookie = preview.ref;

  // Need to delete cookie
  if (!ref && preview.ref) {
    await bootstrap.post('close');
    preview.remove();
  }

  // Need to set cookie
  if (ref && ref !== cookie) {
    await loader();
    preview.set({ref});
  }
}

async function loader() {
  const iframe = await iFrame(`${baseURL}/previews/loading`);

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

  await wait(0.1);

  iframe.style.opacity = 1;

  await wait(1.7);
}

export default { start };
*/

/*

import Config from './config';
import { parseRef } from './helpers';

const bootstrap = new Messenger(`${Config.baseURL}/toolbar/bootstrap`);

async function listen() {
  // Get ref & cookie
  const ref = parseRef(await bootstrap.post('ref'));
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

export default { listen, close };
*/
