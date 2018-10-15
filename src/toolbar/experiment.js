import { script, disabledCookies } from 'common';
import { ExperimentCookie } from './cookies';
import { reloadOrigin } from './config';

export class Experiment {
  constructor(expId) {
    this.cookie = new ExperimentCookie();
    if (!disabledCookies) Experiment.setup(expId);
  }

  start = async expId => {
    await script(`//www.google-analytics.com/cx/api.js?experiment=${expId}`);
    const variation = window.cxApi.chooseVariation();
    if (window.cxApi.NOT_PARTICIPATING) return this.end();

    const old = this.cookie.get();
    this.cookie.set(expId, variation);
    if (this.cookie.get() === old) return;
    reloadOrigin();
  };

  end = () => {
    this.cookie.delete();
    reloadOrigin();
  };
}
