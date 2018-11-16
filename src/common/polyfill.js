const ltIE11 = window.navigator.userAgent.indexOf('MSIE ') > 0;
const isIE11 = window.navigator.userAgent.indexOf('Trident/') > 0;

function loadIEJS(src) {
  return new Promise(resolve => {
    const el = document.createElement('script');
    el.src = src;
    document.head.appendChild(el);
    el.addEventListener('load', _ => resolve(el));
  });
}

export async function polyfillIE() {
  if (ltIE11) throw new Error('Prismic does not support IE 10 or earlier.')
  if (!isIE11) return;
  await loadIEJS('https://cdn.jsdelivr.net/gh/krabbypattified/ie11-polyfill@master/dist/main.js');
  // await loadIEJS('//ie11.test/main.js');
}

export const isIE = Boolean(isIE11 || ltIE11);
