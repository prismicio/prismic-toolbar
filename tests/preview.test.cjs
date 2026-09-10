const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { transformSync } = require('@babel/core');

const root = path.resolve(__dirname, '..');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const repository = 'example.platform-wroom.com';
const cookieName = 'io.prismic.preview';
const markerName = 'io.prismic.preview.updated';
const marker = (ref, repo = repository) => JSON.stringify({ version: 2, repository: repo, ref });
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness({ cookies: initialCookies = {}, framed = false, hostname = 'localhost', protocol = 'http:', cancelEvents = true, previewState = {}, serviceReady, reloadStorage = new Map() } = {}) {
  const cookies = { ...initialCookies };
  const writes = [];
  const events = [];
  const intervals = [];
  const listeners = {};
  const messages = [];
  const window = {
    name: framed ? 'prismic:embedded-preview' : '',
    location: { hostname, protocol, pathname: '/page', href: protocol + '//' + hostname + '/page', reload: () => { result.reloads += 1; } },
    sessionStorage: {
      getItem: key => reloadStorage.get(key) ?? null,
      setItem: (key, value) => reloadStorage.set(key, value),
      removeItem: key => reloadStorage.delete(key),
    },
    parent: { postMessage: (...args) => messages.push(args) },
    setInterval: (run, ms) => { const interval = { run, ms }; intervals.push(interval); return interval; },
    clearInterval: interval => { interval.cleared = true; },
    addEventListener: (name, listener) => { listeners[name] = listener; },
    dispatchEvent: event => { events.push(event); if (result.onEvent) result.onEvent(event); return !cancelEvents; },
  };
  window.self = window;
  window.top = framed ? {} : window;
  const document = {
    visibilityState: 'visible',
    currentScript: { getAttribute: () => 'http://localhost/prismic.js?repo=' + repository },
    createElement: () => ({ href: '' }),
  };
  const result = { cookies, writes, events, intervals, listeners, messages, window, reloads: 0, pingCount: 0, closeCount: 0 };
  const client = {
    hostname: repository,
    getPreviewState: async () => previewState,
    closePreviewSession: async () => { result.closeCount += 1; },
    updatePreview: async () => { result.pingCount += 1; return { ref: 'legacy-next', reload: true }; },
  };
  result.client = client;
  const cache = new Map();
  const context = vm.createContext({
    window, document, URL, console, setInterval: window.setInterval, clearInterval: window.clearInterval,
    CDN_HOST: 'https://prismic.io',
    process: { env: { npm_package_version: '4.1.6' } },
    CustomEvent: class { constructor(type, options) { this.type = type; Object.assign(this, options); } },
  });
  const cookieLibrary = {
    get: name => cookies[name],
    set: (name, value, attributes) => {
      writes.push({ name, value, attributes });
      cookies[name] = typeof value === 'object' ? JSON.stringify(value) : value;
    },
    remove: (name, attributes) => { writes.push({ name, attributes, removed: true }); delete cookies[name]; },
  };
  const mocks = {
    'js-cookie': cookieLibrary,
    '@toolbar-service': { ToolbarService: { getClient: async () => { if (serviceReady) await serviceReady; return client; } } },
    [path.join(root, 'src/toolbar/checkBrowser.js')]: {},
    [path.join(root, 'src/toolbar/preview/screenshot.js')]: () => {},
    [path.join(root, 'src/toolbar/embedded-preview/document-height.js')]: { startDocumentHeightReporting: () => { result.heightStarted = true; } },
    [path.join(root, 'src/toolbar/analytics.js')]: { Analytics: class {} },
  };
  function load(file, parent = path.join(root, 'src/index.js')) {
    if (mocks[file]) return mocks[file];
    let filename = file.startsWith('.') ? path.resolve(path.dirname(parent), file) : file;
    if (file === '@common') {
      return {
        ...load(path.join(root, 'src/common/cookie.js')),
        ...load(path.join(root, 'src/common/events.js')),
        once: fn => { let called; return (...args) => { if (!called) { called = true; return fn(...args); } }; },
        isObject: value => value !== null && typeof value === 'object',
        script: async () => {},
      };
    }
    if (!path.extname(filename)) filename = fs.existsSync(filename + '.js') ? filename + '.js' : path.join(filename, 'index.js');
    if (mocks[filename]) return mocks[filename];
    if (filename.endsWith('/common/general.js')) return { random: () => 'tracker' };
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = transformSync(fs.readFileSync(filename, 'utf8'), {
      filename, babelrc: false, configFile: false,
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
      plugins: ['@babel/plugin-proposal-class-properties'],
    }).code;
    const run = vm.runInContext('(function(require, module, exports) {' + source + '\n})', context, { filename });
    run(request => load(request, filename), module, module.exports);
    return module.exports;
  }
  result.load = file => load(path.join(root, file));
  result.direct = result.load('src/toolbar/direct-preview-watch.js');
  result.watch = () => result.direct.createDirectPreviewRefWatcher({ repository });
  result.previewCookie = () => new (result.load('src/toolbar/preview/cookie.js').PreviewCookie)(true, repository);
  result.preview = cookie => new (result.load('src/toolbar/preview/index.js').Preview)(client, cookie, previewState);
  return result;
}

test('standalone falls back to reloading when no listener handles an update', () => {
  const h = harness({ cancelEvents: false });
  const watch = h.watch();
  h.cookies[cookieName] = 'new-ref';
  h.cookies[markerName] = marker('new-ref');
  watch();
  assert.strictEqual(h.reloads, 1);
});

test('startup reconciles an owned cookie that may be newer than server-rendered content', () => {
  const h = harness({ cookies: { [cookieName]: 'newer-than-SSR', [markerName]: marker('newer-than-SSR') } });
  const watch = h.watch();
  watch();
  watch();
  assert.deepStrictEqual(h.events.map(event => event.detail.ref), ['newer-than-SSR']);
  assert.strictEqual(h.reloads, 0);
});

test('generic startup reloads once per ref and URL without looping across page loads', () => {
  const reloadStorage = new Map();
  const options = { cancelEvents: false, reloadStorage, cookies: { [cookieName]: 'owned', [markerName]: marker('owned') } };
  const firstPage = harness(options);
  firstPage.watch()();
  assert.strictEqual(firstPage.reloads, 1);
  const reloadedPage = harness(options);
  reloadedPage.watch()();
  assert.strictEqual(reloadedPage.reloads, 0);
  const otherPage = harness(options);
  otherPage.window.location.href = 'http://localhost/another-page';
  otherPage.watch()();
  assert.strictEqual(otherPage.reloads, 1);
});

test('blocked session storage cannot create a startup reload loop', () => {
  const h = harness({ cancelEvents: false, cookies: { [cookieName]: 'owned', [markerName]: marker('owned') } });
  h.window.sessionStorage.getItem = () => { throw new Error('Storage unavailable'); };
  const watch = h.watch();
  watch();
  assert.strictEqual(h.events.length, 1);
  assert.strictEqual(h.reloads, 0);
  h.cookies[cookieName] = 'later';
  h.cookies[markerName] = marker('later');
  watch();
  assert.strictEqual(h.reloads, 1);
});

test('startup keeps a ref change received before the first tick and avoids a second reload', () => {
  const reloadStorage = new Map();
  const h = harness({ cancelEvents: false, reloadStorage, cookies: { [cookieName]: 'A', [markerName]: marker('A') } });
  const watch = h.watch();
  h.cookies[cookieName] = 'B';
  h.cookies[markerName] = marker('B');
  watch();
  assert.deepStrictEqual(h.events.map(event => event.detail.ref), ['B']);
  assert.strictEqual(h.reloads, 1);
  const nextPage = harness({ cancelEvents: false, reloadStorage, cookies: { ...h.cookies } });
  nextPage.watch()();
  assert.strictEqual(nextPage.reloads, 0);
});

test('preview exit permits startup reconciliation when the same ref is opened again', () => {
  const reloadStorage = new Map();
  const options = { cancelEvents: false, reloadStorage, cookies: { [cookieName]: 'A', [markerName]: marker('A') } };
  const h = harness(options);
  const watch = h.watch();
  watch();
  delete h.cookies[cookieName];
  delete h.cookies[markerName];
  watch();
  const reopenedPage = harness(options);
  reopenedPage.watch()();
  assert.strictEqual(reopenedPage.reloads, 1);
});

test('a canceled standalone update remains soft and duplicate refs do nothing', () => {
  const h = harness({ cookies: { [cookieName]: 'old-ref', [markerName]: marker('old-ref') } });
  const watch = h.watch();
  h.cookies[cookieName] = '{"looks":"like JSON"}';
  h.cookies[markerName] = marker(h.cookies[cookieName]);
  watch();
  watch();
  assert.strictEqual(h.events.length, 1);
  assert.strictEqual(h.events[0].detail.ref, '{"looks":"like JSON"}');
  assert.strictEqual(h.reloads, 0);
});

test('stale, old-version and foreign-repository markers never claim a legacy ref', () => {
  for (const value of ['v1', marker('stale'), marker('current', 'another.prismic.io'), '{', 'null']) {
    const h = harness({ cookies: { [cookieName]: 'current', [markerName]: value } });
    const watch = h.watch();
    h.cookies[cookieName] = 'legacy-change';
    watch();
    assert.strictEqual(h.events.length, 0, value);
  }
});

test('standalone detects preview exit once and can restart at the same ref', () => {
  const h = harness({ cookies: { [cookieName]: 'A', [markerName]: marker('A') } });
  const watch = h.watch();
  delete h.cookies[cookieName];
  delete h.cookies[markerName];
  watch();
  watch();
  h.cookies[cookieName] = 'A';
  h.cookies[markerName] = marker('A');
  watch();
  assert.deepStrictEqual(h.events.map(event => event.type), ['prismicPreviewEnd', 'prismicPreviewUpdate']);
});

test('authenticated prediction reads and tracker refresh do not rewrite an editor ref', () => {
  const h = harness({ cookies: { [cookieName]: 'opaque', [markerName]: marker('opaque') } });
  const cookie = h.previewCookie();
  assert.strictEqual(cookie.getTracker(), undefined);
  cookie.refreshTracker();
  assert.strictEqual(cookie.getRefForDomain(), 'opaque');
  assert.strictEqual(h.cookies[cookieName], 'opaque');
  assert.strictEqual(h.writes.length, 0);
});

test('editor ownership prevents legacy startup sync and polling from overwriting the cookie', async () => {
  const h = harness({ cookies: { [cookieName]: 'editor', [markerName]: marker('editor') } });
  const cookie = h.previewCookie();
  assert.strictEqual(cookie.sync('legacy'), false);
  const preview = h.preview(cookie);
  await preview.updatePreview();
  assert.strictEqual(h.pingCount, 0);
  assert.strictEqual(h.cookies[cookieName], 'editor');
});

test('a legacy ping already in flight is discarded after editor takeover', async () => {
  const h = harness();
  let finishPing;
  h.client.updatePreview = () => new Promise(resolve => { finishPing = resolve; });
  const preview = h.preview(h.previewCookie());
  const pending = preview.updatePreview();
  h.cookies[cookieName] = 'editor';
  h.cookies[markerName] = marker('editor');
  finishPing({ ref: 'legacy', reload: true });
  await pending;
  assert.strictEqual(h.cookies[cookieName], 'editor');
  assert.strictEqual(h.events.length, 0);
  assert.strictEqual(h.reloads, 0);
});

test('editor takeover also wins while legacy session cleanup is in flight', async () => {
  const h = harness();
  let finishClose;
  h.client.updatePreview = async () => ({ ref: null, reload: true });
  h.client.closePreviewSession = () => new Promise(resolve => { finishClose = resolve; });
  const pending = h.preview(h.previewCookie()).updatePreview();
  await flush();
  h.cookies[cookieName] = 'editor';
  h.cookies[markerName] = marker('editor');
  finishClose();
  await pending;
  assert.strictEqual(h.cookies[cookieName], 'editor');
  assert.strictEqual(h.events.length, 0);
});

test('a falsy legacy ping ends once without dispatching a stale update as well', async () => {
  const h = harness({ cancelEvents: false });
  h.client.updatePreview = async () => ({ ref: null, reload: true });
  await h.preview(h.previewCookie()).updatePreview();
  assert.deepStrictEqual(h.events.map(event => event.type), ['prismicPreviewEnd']);
  assert.strictEqual(h.reloads, 1);
});

test('a new legacy cookie invalidates editor ownership and preserves legacy polling', async () => {
  const h = harness({ cookies: { [cookieName]: 'legacy', [markerName]: marker('old-editor') } });
  const preview = h.preview(h.previewCookie());
  await preview.updatePreview();
  assert.strictEqual(h.pingCount, 1);
  assert.strictEqual(h.previewCookie().getRefForDomain(), 'legacy-next');
  assert.strictEqual(h.events.length, 1);
});

test('ending an editor-owned preview clears the cookie and its marker', () => {
  const h = harness({ cookies: { [cookieName]: 'editor', [markerName]: marker('editor') } });
  h.previewCookie().deletePreviewForDomain();
  assert.strictEqual(h.cookies[cookieName], undefined);
  assert.strictEqual(h.cookies[markerName], undefined);
});

test('another repository cannot rewrite or delete an editor-owned cookie', () => {
  const h = harness({ cookies: { [cookieName]: 'other', [markerName]: marker('other', 'another.prismic.io') } });
  const cookie = h.previewCookie();
  assert.strictEqual(cookie.getRefForDomain(), undefined);
  cookie.refreshTracker();
  cookie.upsertPreviewForDomain('local');
  cookie.deletePreviewForDomain();
  assert.strictEqual(h.cookies[cookieName], 'other');
  assert.strictEqual(h.writes.length, 0);
});

test('push reload:false writes an opaque ref, emits once and never hard reloads', async () => {
  const h = harness({ framed: true, cancelEvents: false });
  const { EmbeddedPreviewCookie } = h.load('src/toolbar/embedded-preview/index.js');
  const preview = h.preview(new EmbeddedPreviewCookie());
  await preview.updateFromRef('not:a:parsed-format', false);
  await preview.updateFromRef('not:a:parsed-format', false);
  assert.strictEqual(h.cookies[cookieName], 'not:a:parsed-format');
  assert.strictEqual(h.events.length, 1);
  assert.strictEqual(h.reloads, 0);
});

test('old editor pushes retain the hard reload fallback on mismatch', async () => {
  const h = harness({ framed: true, cancelEvents: false });
  const { EmbeddedPreviewCookie } = h.load('src/toolbar/embedded-preview/index.js');
  await h.preview(new EmbeddedPreviewCookie()).updateFromRef('legacy');
  assert.strictEqual(h.reloads, 1);
});

test('an unchanged old-editor ref is already synchronized without a reload', async () => {
  const h = harness({ framed: true, cancelEvents: false, cookies: { [cookieName]: 'legacy' } });
  const { EmbeddedPreviewCookie } = h.load('src/toolbar/embedded-preview/index.js');
  await h.preview(new EmbeddedPreviewCookie()).updateFromRef('legacy');
  assert.strictEqual(h.reloads, 0);
  assert.strictEqual(h.events.length, 0);
});

test('a matched cookie still gets its initial controlled refresh', async () => {
  const h = harness({ framed: true, cancelEvents: false, cookies: { [cookieName]: 'opaque' } });
  const { EmbeddedPreviewCookie } = h.load('src/toolbar/embedded-preview/index.js');
  await h.preview(new EmbeddedPreviewCookie()).updateFromRef('opaque', false);
  assert.strictEqual(h.reloads, 0);
  assert.strictEqual(h.events.length, 1);
});

test('malformed parent messages cannot update the cookie', async () => {
  const h = harness({ framed: true });
  const { EmbeddedPreviewCookie, setupEmbeddedPreviewPush } = h.load('src/toolbar/embedded-preview/index.js');
  setupEmbeddedPreviewPush({ preview: h.preview(new EmbeddedPreviewCookie()), repository });
  for (const data of [null, {}, { type: 'wrong', token: 'A' }, { type: 'prismic:embedded-preview:set-ref', token: '' }, { type: 'prismic:embedded-preview:set-ref', token: {} }]) {
    h.listeners.message({ origin: 'https://example.platform-wroom.com', source: h.window.parent, data });
  }
  await flush();
  assert.strictEqual(h.writes.length, 0);
});

test('pending ownership takes effect only when its ref matches the actual cookie', () => {
  const h = harness({ cookies: { [cookieName]: 'older' } });
  h.direct.markDirectPreviewRefUpdated({ repository, ref: 'newer' });
  assert.strictEqual(h.direct.getDirectPreviewState(), undefined);
  h.cookies[cookieName] = 'newer';
  assert.strictEqual(h.direct.getDirectPreviewState().ref, 'newer');
});

test('only trusted parent reload:false messages establish explicit ownership', async () => {
  const h = harness({ framed: true });
  const { EmbeddedPreviewCookie, setupEmbeddedPreviewPush } = h.load('src/toolbar/embedded-preview/index.js');
  const preview = h.preview(new EmbeddedPreviewCookie());
  setupEmbeddedPreviewPush({ preview, repository });
  const data = { type: 'prismic:embedded-preview:set-ref', token: 'opaque', reload: false };
  h.listeners.message({ origin: 'https://evil.example', source: h.window.parent, data });
  h.listeners.message({ origin: 'https://example.platform-wroom.com', source: {}, data });
  h.listeners.message({ origin: 'https://example.platform-wroom.com.attacker.example', source: h.window.parent, data });
  await flush();
  assert.strictEqual(h.cookies[cookieName], undefined);
  h.listeners.message({ origin: 'https://example.platform-wroom.com', source: h.window.parent, data });
  await flush();
  assert.strictEqual(h.cookies[markerName], marker('opaque'));
  const markerWrite = h.writes.find(write => write.name === markerName);
  assert.strictEqual(markerWrite.attributes.expires, null);
  assert.strictEqual(markerWrite.attributes.sameSite, 'none');
  assert.strictEqual(markerWrite.attributes.secure, true);
  delete h.cookies[markerName];
  h.listeners.message({ origin: 'https://example.platform-wroom.com', source: h.window.parent, data: { ...data, token: 'old-editor', reload: true } });
  await flush();
  assert.strictEqual(h.cookies[markerName], undefined);
});

test('ownership is established before an update listener can convert the shared cookie', async () => {
  const h = harness({ framed: true });
  const { EmbeddedPreviewCookie, setupEmbeddedPreviewPush } = h.load('src/toolbar/embedded-preview/index.js');
  setupEmbeddedPreviewPush({ preview: h.preview(new EmbeddedPreviewCookie()), repository });
  h.onEvent = event => {
    if (event.type === 'prismicPreviewUpdate') {
      const regularCookie = h.previewCookie();
      regularCookie.getTracker();
      regularCookie.refreshTracker();
    }
  };
  h.listeners.message({
    origin: 'https://example.platform-wroom.com', source: h.window.parent,
    data: { type: 'prismic:embedded-preview:set-ref', token: 'new-ref', reload: false },
  });
  await flush();
  assert.strictEqual(h.cookies[cookieName], 'new-ref');
  assert.strictEqual(h.cookies[markerName], marker('new-ref'));
});

test('loopback iframe cookie writes retain SameSite=None; Secure without changing normal HTTP hosts', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const h = harness({ framed: true, hostname });
    h.load('src/common/cookie.js').setCookie('example', 'value');
    assert.strictEqual(h.writes[0].attributes.sameSite, 'none');
    assert.strictEqual(h.writes[0].attributes.secure, true);
  }
  const h = harness({ framed: true, hostname: 'site.test' });
  h.load('src/common/cookie.js').setCookie('example', 'value');
  assert.strictEqual(h.writes[0].attributes.sameSite, 'lax');
  assert.strictEqual(h.writes[0].attributes.secure, undefined);
});

test('standalone watcher starts before remote toolbar bootstrap can swallow an edit', async () => {
  let resolveService;
  const h = harness({ serviceReady: new Promise(resolve => { resolveService = resolve; }) });
  h.load('src/toolbar/index.js');
  assert.strictEqual(h.intervals.length, 1);
  assert.strictEqual(h.intervals[0].ms, 250);
  h.cookies[cookieName] = 'during-startup';
  h.cookies[markerName] = marker('during-startup');
  h.intervals[0].run();
  assert.strictEqual(h.events.filter(event => event.type === 'prismicPreviewUpdate').length, 1);
  resolveService();
  await flush();
});

test('legacy standalone keeps its three-second poll alongside the direct watcher', async () => {
  const h = harness({
    previewState: { preview: { ref: 'legacy' } },
    cookies: { [cookieName]: JSON.stringify({ [repository]: { preview: 'legacy' } }) },
  });
  h.window.prismic = { Toolbar: class {} };
  h.load('src/toolbar/index.js');
  await flush();
  assert.deepStrictEqual(h.intervals.map(interval => interval.ms).sort(), [250, 3000]);
});

test('controlled iframe never starts either cookie watching or legacy polling', async () => {
  const h = harness({ framed: true });
  h.load('src/toolbar/index.js');
  await flush();
  assert.strictEqual(h.intervals.length, 0);
  assert.strictEqual(h.messages[0][0].type, 'prismic:embedded-preview:ready');
});

test('unrelated iframes do not initialize the toolbar', async () => {
  const h = harness({ framed: true });
  h.window.name = 'unrelated-iframe';
  h.load('src/toolbar/index.js');
  await flush();
  assert.strictEqual(h.intervals.length, 0);
  assert.strictEqual(h.messages.length, 0);
  assert.strictEqual(h.window.prismic, undefined);
});

(async () => {
  let failed = 0;
  for (const { name, run } of tests) {
    try {
      await run();
      console.log('PASS ' + name);
    } catch (error) {
      failed += 1;
      console.error('FAIL ' + name + '\n' + error.stack);
    }
  }
  console.log(`${tests.length - failed}/${tests.length} preview tests passed`);
  process.exitCode = failed ? 1 : 0;
})();
