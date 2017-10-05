import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Utils from './utils';

function setupToolbar(endpoint) {
  if (endpoint) {
    Toolbar.setup();
    EditBtn.setup(endpoint);
  }
}

export default {
  setup: Utils.debounce(setupToolbar, 500),

  startExperiment(expId) {
    Experiments.start(expId);
  },
};
