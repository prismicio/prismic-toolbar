import Share from './share';
import Utils from './utils';
import { config, globals, START_EXPERIMENT, setupToolbar, setupEditButton } from './config';

(async () => {
  // Globals
  window.prismic = globals;

  // Polyfills
  const features = [];
  if (!window.Promise) features.push('Promise');
  if (!window.fetch) features.push('fetch');
  if (features.length) await Utils.script(`https://cdn.polyfill.io/v2/polyfill.min.js?features=${features.join(',')}&flags=gated,always`);

  // Setup
  setTimeout(0, () => {
    if (!config) return;
    Share.listen(config, () => {
      START_EXPERIMENT();
      setupToolbar();
      setupEditButton();
    });
  });
})();
