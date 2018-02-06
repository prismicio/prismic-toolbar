import PrismicToolbar from './index';
import Version from './version';

document.addEventListener('DOMContentLoaded', () => {
  if (window.prismic && window.prismic.endpoint) {
    PrismicToolbar.setup(window.prismic.endpoint);
  }
});

exports.setup = PrismicToolbar.setup;
exports.startExperiment = PrismicToolbar.startExperiment;
exports.version = Version.value;
