import { script, disabledCookies } from 'common';
import { experiment } from './cookies';

export class Experiment {
  constructor(expId) {
    if (!disabledCookies) Experiment.setup(expId);
  }

  static async setup(expId) {
    await script(`//www.google-analytics.com/cx/api.js?experiment=${expId}`);
    const variation = window.cxApi.chooseVariation();
    if (window.cxApi.NOT_PARTICIPATING) experiment.remove();
    else experiment.set(expId, variation);
  }
}
