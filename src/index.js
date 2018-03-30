import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Utils from './utils';
import Version from './version';
import Share from './share';

const PRISMIC_ENDPOINT = window.prismic && window.prismic.endpoint;
let START_EXPERIMENT = () => {};

const config = (() => {
  const matches = PRISMIC_ENDPOINT && PRISMIC_ENDPOINT.match(new RegExp('(https?://([^/]*))'));
  if (matches && matches[1] && matches[2]) {
    const baseURL = matches[1].replace(/\.cdn\.prismic\.io/, '.prismic.io');
    const editorTab = matches[2].replace(/\.cdn\.prismic\.io/, '.prismic.io');
    const location = {
      origin: window.location.origin,
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
    };
    return { baseURL, editorTab, location };
  }
  return null;
})();

const setupToolbar = Utils.debounce(() => Toolbar.setup(), 500, true);

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

// listen to session iframe
window.addEventListener('message', e => {
  if (e.data.type === 'preview') {
    window.prismicSession = e.data.data
    if (config) {
      Share.listen(config, () => {
        START_EXPERIMENT();
        setupToolbar();
        setupEditButton();
      });
    }
  }
})

// session iframe
const parser = document.createElement('a');
parser.href = PRISMIC_ENDPOINT;
const iframe = document.createElement('iframe');
iframe.src = `${parser.protocol}//${parser.host}/previews/session/get`;
iframe.style.display = 'none';
setTimeout(_ => {
  document.body.appendChild(iframe);
}, 0);

exports.setup = setupToolbar;
exports.setupEditButton = setupEditButton;
exports.startExperiment = startExperiment;
exports.version = Version.value;
exports.endpoint = PRISMIC_ENDPOINT;

window.prismic = {
  setup: setupToolbar,
  startExperiment,
  setupEditButton,
  version: Version.value,
  endpoint: PRISMIC_ENDPOINT,
};
