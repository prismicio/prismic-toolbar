import { script, disabledCookies } from 'common';
import { experiment } from './cookies';
import { reloadOrigin } from './config';

export class Experiment {
  constructor(expId) {
    if (!disabledCookies) Experiment.setup(expId);
  }

  start = async expId => {
    await script(`//www.google-analytics.com/cx/api.js?experiment=${expId}`);
    const variation = window.cxApi.chooseVariation();
    if (window.cxApi.NOT_PARTICIPATING) return this.end();

    const old = experiment.get();
    experiment.set(expId, variation);
    if (experiment.get() === old) return;
    reloadOrigin();
  };

  end = () => {
    experiment.delete();
    reloadOrigin();
  };
}
