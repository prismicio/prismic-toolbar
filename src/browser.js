import PrismicToolbar from './index';

document.addEventListener('DOMContentLoaded', () => {
  if (window.prismic && window.prismic.endpoint) {
    PrismicToolbar.setup(window.prismic.endpoint);
  }
});

exports.setup = PrismicToolbar.setup;
exports.startExperiment = PrismicToolbar.startExperiment;
