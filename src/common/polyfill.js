const ltIE11 = window.navigator.userAgent.indexOf('MSIE ') > 0;
const isIE11 = window.navigator.userAgent.indexOf('Trident/') > 0;

function loadJS(src) {
  return new Promise(resolve => {
    const el = document.createElement('script');
    el.src = src
    document.body.appendChild(el);
    el.addEventListener('load', () => resolve(el));
  });
}

export async function polyfillIE() {
  if (ltIE11) throw new Error('Prismic does not support IE 10 or earlier.')
  if (!isIE11) return;
  await loadJS('//local:9000/main.js'); // TODO handle dev and prod
}
