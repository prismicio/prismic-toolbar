import Cookies from 'js-cookie';
import { reload, query, random, normalizeRef } from 'common';

// Preview cookie manager

class PreviewCookie {
  constructor() {
    this.name = 'io.prismic.preview';
    this.auth = Boolean(this.get().ref);
    this.fixCookie();
  }

  // State

  setState(state) {
    Object.assign(this, state);
  }

  // Fix bad cookie (from server, auth, etc)

  fixCookie() {
    const { ref, url, track, breaker } = this;
    demolishCookie(name); // remove later
    this.set({ ref, url, track, breaker });
  }

  // Cookie get/set

  get() {
    return normalizeRef(getCookie(this.name));
  }

  set(args) {
    const { ref, url, track, breaker } = Object.assign(this.get(), args);
    if (!ref) return deleteCookie(this.name); // Always need ref or remove all state
    const qs = '?' + query({ url, track, breaker });
    setCookie(this.name, this.auth ? ref + qs : ref, 0.1);
  }

  // Master

  get master() {
    return new Promise(resolve => {
      if (this._master) resolve(this._master);
      else this.resolveMaster = resolve;
    });
  }

  set master(value) {
    this._master = value;
    if (this.resolveMaster) this.resolveMaster(value);
  }

  // Ref

  get ref() {
    return this.get().ref;
  }

  set ref() {
    this.set({ ref });
  }

  setPreview(ref) {
    if (!ref) return this.delPreview(); // No ref
    if (ref === this.ref) return; // Same ref
    this.set({ ref }); // Set
    reload(); // Reload
  }

  async delPreview() {
    const oldRef = this.ref;
    const master = await this.master;

    // Delete
    if (this.auth) this.set({ ref: master });
    else deleteCookie(this.name);

    // Reload
    if (oldRef && oldRef !== master) reload();
  }

  // Url

  get url() {
    return this.get().url;
  }

  set url(value) {
    this.set({ url: value });
  }

  // Track

  get track() {
    return this.get().track;
  }

  set track(value) {
    this.set({ track: value });
  }

  // Breaker

  get breaker() {
    return this.get().breaker;
  }

  set breaker(value) {
    this.set({ breaker: value });
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
export function demolishCookie(name) {
  const subdomains = window.location.hostname.split('.'); // ['www','gosport','com']
  const subpaths = window.location.pathname.slice(1).split('/'); // ['my','path']

  const DOMAINS = []
    .concat(subdomains.map((sub, idx) => `${subdomains.slice(idx).join('.')}`)) // www.gosport.com
    .concat(subdomains.map((sub, idx) => `.${subdomains.slice(idx).join('.')}`)) // .gosport.com
    .concat(null); // no domain specified

  const PATHS = []
    .concat(subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}`)) // /a/b/foo
    .concat(subpaths.map((path, idx) => `/${subpaths.slice(0, idx + 1).join('/')}/`)) // /a/b/foo/
    .concat('/') // root path
    .concat(null); // no path specified

  DOMAINS.forEach(domain =>
    PATHS.forEach(path => Cookies.remove(name, { domain, path }))
  );
}

// Exports

export const preview = new PreviewCookie();
export const experiment = new ExperimentCookie();
