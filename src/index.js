import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Utils from './utils';
import Version from './version';

function buildConfig(endpoint) {
  const matches = endpoint.match(new RegExp('(https?://([^/]*))'));
  if (matches) {
    const baseURL = matches[1].replace(/\.cdn\.prismic\.io/, '.prismic.io');
    const editorTab = matches[2].replace(/\.cdn\.prismic\.io/, '.prismic.io');
    return { baseURL, editorTab };
  }
  return {};
}

function setupToolbar(endpoint) {
  if (endpoint) {
    const config = buildConfig(endpoint);
    Toolbar.setup(config);
    EditBtn.setup(config);
  }
}

export default {
  setup: Utils.debounce(setupToolbar, 500),

  startExperiment(expId) {
    Experiments.start(expId);
  },

  version: Version.value,
};
