import { experiment } from './cookies';
import { script, disabledCookies } from './utils';

async function setup(expId) {
  if (disabledCookies) return;
  await script(`//www.google-analytics.com/cx/api.js?experiment=${expId}`);
  const variation = window.cxApi.chooseVariation();
  if (window.cxApi.NOT_PARTICIPATING) end();
  else start(expId, variation);
}

function start(expId, variation) {
  experiment.set(expId, variation);
}

function end() {
  experiment.remove();
}

export default { setup, start, end };
