if (!global._babelPolyfill) require('babel-polyfill');
if (!window.EventTarget) window.EventTarget = require('event-target');
require('events-polyfill');
require('whatwg-fetch');
