import {
  reload,
  query,
  normalizeRef,
  getCookie,
  setCookie,
  deleteCookie,
  demolishCookie,
} from 'common';

// Preview cookie manager

class PreviewCookie {
  constructor() {
    this.name = 'io.prismic.preview';
    this.useQuery = Boolean(this.ref);
    this.fixCookie();
  }

  // Fix bad cookie from server (remove this later)

  fixCookie() {
    const { ref, url, track, breaker } = this;
    demolishCookie(this.name);
    this.set({ ref, url, track, breaker });
  }

  // Cookie getter setter deleter

  get() {
    return normalizeRef(getCookie(this.name));
  }

  set(args) {
    const { ref, url, track, breaker } = Object.assign(this.get(), args);
    if (!ref) return this.delete(); // Always need ref or remove all state
    const qs = `?${query({ url, track, breaker })}`;
    setCookie(this.name, this.useQuery ? ref + qs : ref, 0.1);
  }

  delete() {
    deleteCookie(this.name);
  }

  // Ref

  get ref() {
    return this.get().ref;
  }

  set ref(_ref) {
    this.set({ ref: _ref });
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
    reload(); // TODO in experiment.js
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
