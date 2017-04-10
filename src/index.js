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
  setup: Utils.throttle(setupToolbar, 500, { trailing: false }),

  startExperiment(expId) {
    Experiments.start(expId);
  },
};
