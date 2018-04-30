import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Version from './version';
import Config from './config';
import { debounce } from './utils';

export const setupToolbar = debounce(() => Toolbar.setup(), 500, true);
export const setupEditButton = EditBtn.setup;

let START_EXPERIMENT = () => {};
function startExperiment(expId) {
  if (expId) {
    START_EXPERIMENT = () => Experiments.start(expId);
  }
}

export const startExp = () => START_EXPERIMENT();

export const globals = {
  startExperiment,
  setupEditButton,
  setup: setupToolbar,
  version: Version.value,
  endpoint: Config.endpoint,
};
