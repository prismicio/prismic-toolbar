import Share from './share';
import Utils from './utils';
import Config from './config';
import Globals, { startExp, setupToolbar, setupEditButton } from './globals';

(async () => {
  // Globals
  window.prismic = Globals;

  // Polyfills
  const features = [];
  if (!window.Promise) features.push('Promise');
  if (!window.fetch) features.push('fetch');
  if (features.length) await Utils.script(`https://cdn.polyfill.io/v2/polyfill.min.js?features=${features.join(',')}&flags=gated,always`);

  // Setup
  setTimeout(0, () => {
    if (!Config) return;
    Share.listen(Config, () => {
      startExp(); // TODO not stable
      setupToolbar();
      setupEditButton();
    });
  });
})();
