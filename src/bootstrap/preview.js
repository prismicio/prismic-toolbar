import Messenger from './messenger';
import { iFrame, wait } from '../common';
import { preview } from './cookies';
import { baseURL } from './config';

const bootstrap = new Messenger(`${baseURL}/toolbar/bootstrap`);

async function start() {
  // Get ref & cookie
  const ref = await bootstrap.post('ref');
  const cookie = preview.get();

  // Need to delete cookie
  if (!ref && cookie) {
    await bootstrap.post('close');
    preview.remove();
  }

  // Need to set cookie
  if (ref && ref !== cookie) {
    await loader();
    preview.set(ref);
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
