import Preview from './preview';
import { baseURL } from './config';
import { iFrame, wait } from './utils';

// Get preview ref from iframe
const REF_IFRAME = iFrame(`${baseURL}/previews/messenger`);
const REF_PROMISE = new Promise(resolve => {
  window.addEventListener('message', msg => {
    if (msg.data.type !== 'previewRef') return;
    resolve(msg.data.data);
  });
});

async function listen() {
  const ref = (await REF_PROMISE) || null;
  const cookie = Preview.get() || null;

  // need to delete cookie
  if (!ref && cookie) {
    close();
    Preview.close();
    window.location.reload();
  }

  // need to set cookie (missed change or another session)
  if (ref && ref !== cookie) {
    await displayLoading();
    Preview.set(ref);
    window.location.reload();
  }
}

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
