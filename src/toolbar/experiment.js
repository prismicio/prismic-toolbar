import { script, disabledCookies } from '@common';
import { ExperimentCookie } from './cookies';
import { reloadOrigin } from './utils';

export class Experiment {
  constructor(expId) {
    this.cookie = new ExperimentCookie();
    this.expId = expId;
    this.setup();
  }

  async setup() {
    if (disabledCookies()) return;
    await script(`//www.google-analytics.com/cx/api.js?experiment=${this.expId}`);
    this.variation = window.cxApi.chooseVariation();
    if (this.variation === window.cxApi.NOT_PARTICIPATING) this.end();
    else this.start();
  }

  async start() {
    const old = this.cookie.get();
    this.cookie.set(this.expId, this.variation);
    if (this.cookie.get() !== old) reloadOrigin();
  }

  end() {
    const old = this.cookie.get();
    this.cookie.delete();
    if (this.cookie.get() !== old) reloadOrigin();
  }
}
