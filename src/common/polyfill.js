// Browser detection
const ltIE11 = window.navigator.userAgent.indexOf('MSIE ') > 0;
const isIE11 = window.navigator.userAgent.indexOf('Trident/') > 0;
const isIE = ltIE11 | isIE11;

// Callback vars
const callbacks = []
const isPolyfilled = isIE ? false : true

// Run code after polyfilled
export function withPolyfill(func) {
  return function() {
    // No return values
    if (isPolyfilled) func.apply(this, arguments)
    callbacks.push(func.bind(this, arguments))
  }
}

// Trigger polyfill callbacks
function dispatchPolyfill() {
  isPolyfilled = true
  callbacks.forEach(c => c())
}

// Load the polyfills
if (ltIE11) throw new Error('Prismic does not support IE 10 or earlier.')
if (isIE11) loadScript('https://cdn.jsdelivr.net/gh/krabbypattified/ie11-polyfill@master/dist/main.js', dispatchPolyfill);
// loadIEJS('//ie11.test/main.js', callback);

// Load a script
function loadScript(src, callback) {
  const el = document.createElement('script');
  el.src = src;
  document.head.appendChild(el);
  el.addEventListener('load', _ => callback(el));
}