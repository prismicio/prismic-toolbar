import Cookies from 'js-cookie';
import { reload, query, parseQuery, random } from 'common';
import { bootstrap } from './config';

// Preview cookie manager

class PreviewCookie {
  name = 'io.prismic.preview';

  constructor() {
    // Get state
    Object.assign(this, {
      authorized: Boolean(this.get().ref), // quic auth
      master: bootstrap.post('state').then(s => s.master),
    });

    // Fix servers setting bad cookies
    const { ref, url, track, breaker } = this;
    demolishCookie(name);
    this.set({ ref, url, track, breaker });

    // ALWAYS have the correct tracker
    this.authSetup();
  }

  // Tracking fetures

  async authSetup() {
    // URL Request Hooks
    const hooks = new Hooks();
    const url = window.location.pathname;

    // Enable
    if (this.authorized) {
      this.track = random(8);
      this.breakerTimer = setInterval(_ => (this.breaker = random(8)), 100);
      // TODO beforeUnload change track?
      hooks.on('beforeRequest', _ => (this.url = url));
      hooks.on('afterRequest', _ => (this.url = null));
    }

    // Permanent auth state
    const state = await bootstrap.post('state');
    this.authorized = state.authorized;

    // Disable
    if (!this.authorized) {
      clearInterval(this.breakerTimer);
      hooks.off();
      this.set(); // clear querystring
    }
  }

  // Private

  get = _ => normalizeRef(getCookie(this.name));

  set = ({ ref = this.ref, url, track, breaker }) => {
    const qs = query({ url, track, breaker });
    const value = this.authorized ? `${ref}?${qs}` : ref;
    setCookie(this.name, value, 0.1);
  };

  // Getters

  get ref() {
    return this.get().ref;
  }

  get url() {
    return this.get().url;
  }

  get track() {
    return this.get().track;
  }

  get breaker() {
    return this.get().breaker;
  }

  // Setters

  set url(value) {
    this.set({ ...this.get(), url: value });
  }

  set track(value) {
    this.set({ ...this.get(), track: value });
  }

  set breaker(value) {
    this.set({ ...this.get(), breaker: value });
  }

  setRef(value, { reload: shouldReload = false }) {
    if (value !== this.ref) return;
    this.set({ ...this.get(), ref: value });
    if (shouldReload) reload();
  }

  // Delete

  async deleteRef({ reload: shouldReload = false }) {
    if (this.authorized) this.set({ ...this.get(), ref: await this.master });
    else deleteCookie(this.name);
    if (shouldReload) reload();
  }
}

// Experiment cookie manager

class ExperimentCookie {
  name = 'io.prismic.experiment';

  get() {
    return getCookie(this.name);
  }

  set(expId, variation) {
    const value = [expId, variation].join(' ');
    if (value === this.get()) return;
    setCookie(this.name, value);
    reload();
  }

  delete() {
    if (!this.get()) return;
    deleteCookie(this.name);
    reload();
  }
}

// Exports

export const preview = new PreviewCookie();
export const experiment = new ExperimentCookie();

// Helpers

function getCookie(name) {
  return Cookies.get(name); // or undefined
}

function setCookie(name, value, expires = Infinity /* days */) {
  const path = '/';
  return Cookies.set(name, value, { path, expires });
}

function deleteCookie(name) {
  const path = '/';
  Cookies.remove(name, { path });
}

// TODO remove after we force no /preview route (url prediction)
function demolishCookie(name) {
  const subdomains = window.location.hostname.split('.'); // ['www','gosport','com']
  const subpaths = window.location.pathname.slice(1).split('/'); // ['my','path']

  const DOMAINS = []
    .concat(subdomains.map((sub, idx) => `${subdomains.slice(idx).join('.')}`)) // www.gosport.com
    .concat(subdomains.map((sub, idx) => `.${subdomains.slice(idx).join('.')}`)) // .gosport.com
    .concat(null); // no domain specified

  const PATHS = []
    .concat(
      subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}`)
    ) // /a/b/foo
    .concat(
      subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}/`)
    ) // /a/b/foo/
    .concat('/') // root path
    .concat(null); // no path specified

  DOMAINS.forEach(domain =>
    PATHS.forEach(path => Cookies.remove(name, { domain, path }))
  );
}
