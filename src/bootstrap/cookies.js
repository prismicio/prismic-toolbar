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
    this.auth = Boolean(this.ref);
    this.fixCookie();
  }

  // State

  set state(state) {
    Object.assign(this, state);
  }

  // Fix bad cookie (from server, auth, etc)

  fixCookie() {
    const { ref, url, track, breaker } = this;
    demolishCookie(this.name); // remove later
    this.set({ ref, url, track, breaker });
  }

  // Cookie (getter & setter)

  get() {
    return normalizeRef(getCookie(this.name));
  }

  set(args) {
    const { ref, url, track, breaker } = Object.assign(this.get(), args);
    if (!ref) return deleteCookie(this.name); // Always need ref or remove all state
    const qs = `?${query({ url, track, breaker })}`;
    setCookie(this.name, this.auth ? ref + qs : ref, 0.1);
  }

  // Preview

  setPreview = async ref => {
    if (!ref) return this.closePreview(); // No ref
    if (ref === this.ref) return; // Same ref
    this.set({ ref }); // Set
    reload(); // Reload
  };

  closePreview = async () => {
    const oldRef = this.ref;
    const master = await this.master;
    const messenger = await this.messenger;

    // Delete
    await messenger.post('closePreview');

    if (this.auth) this.set({ ref: master });
    else deleteCookie(this.name);

    // Reload
    if (oldRef && oldRef !== master) reload();
  };

  // Messenger (async value) TODO

  get messenger() {
    if (this._messenger) return Promise.resolve(this._messenger);
    return new Promise(resolve => (this.resolveMessenger = resolve));
  }

  set messenger(value) {
    this._messenger = value;
    if (this.resolveMessenger) this.resolveMessenger(value);
  }

  // Master (async value) TODO

  get master() {
    if (this._master) return Promise.resolve(this._master);
    return new Promise(resolve => (this.resolveMaster = resolve));
  }

  set master(value) {
    this._master = value;
    if (this.resolveMaster) this.resolveMaster(value);
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
