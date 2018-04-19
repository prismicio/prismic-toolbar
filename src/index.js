import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Utils from './utils';
import Version from './version';
import Share from './share';

// TODO polyfill.io: https://polyfill.io/v2/docs/examples
// TODO html2canvas -> https://unpkg.com/dom-to-image@2.6.0/dist/dom-to-image.min.js
// dom-to-image docs: https://github.com/tsayen/dom-to-image

const PRISMIC_ENDPOINT = window.prismic && window.prismic.endpoint;
let START_EXPERIMENT = () => {};

export const config = (() => {
  const matches = PRISMIC_ENDPOINT && PRISMIC_ENDPOINT.match(new RegExp('(https?://([^/]*))'));
  if (matches && matches[1] && matches[2]) {
    const baseURL = matches[1].replace(/\.cdn\.prismic\.io/, '.prismic.io');
    const corsLink = iFrame(`${baseURL}/previews/messenger`);
    const editorTab = matches[2].replace(/\.cdn\.prismic\.io/, '.prismic.io');
    const location = {
      origin: window.location.origin,
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
    };
    return { baseURL, editorTab, location, corsLink };
  }
  return null;
})();

const setupToolbar = Utils.debounce(() => Toolbar.setup(), 500, true);

function iFrame(src) {
  const iframe = document.createElement('iframe');
  iframe.src = src;
  document.head.appendChild(iframe);
  return iframe;
}

function setupEditButton() {
  if (config) {
    EditBtn.setup(config);
  }
}

function startExperiment(expId) {
  if (expId) {
    START_EXPERIMENT = () => Experiments.start(expId);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (config) {
    Share.listen(config, () => {
      START_EXPERIMENT();
      setupToolbar();
      setupEditButton();
    });
  }
});

window.prismic = {
  setup: setupToolbar,
  startExperiment,
  setupEditButton,
  version: Version.value,
  endpoint: PRISMIC_ENDPOINT,
};
