import { experiment } from './cookies';
import { script, disabledCookies } from './utils';

async function start(expId) {
  if (disabledCookies) return;
  await script(`//www.google-analytics.com/cx/api.js?experiment=${expId}`);
  const variation = window.cxApi.chooseVariation();
  if (window.cxApi.NOT_PARTICIPATING) end();
  else experiment.set(expId, variation);
}

function end() {
  experiment.remove();
}

export default { start, end };
