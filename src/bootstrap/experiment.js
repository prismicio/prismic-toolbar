import { experiment } from './cookies';
import { script, disabledCookies } from '../common';

export class Experiments {
  constructor(expId) {
    if (disabledCookies) return;
    await script(`//www.google-analytics.com/cx/api.js?experiment=${expId}`);
    const variation = window.cxApi.chooseVariation();
    if (window.cxApi.NOT_PARTICIPATING) experiment.remove();
    else experiment.set(expId, variation);
  }
}
