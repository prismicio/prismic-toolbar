import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Utils from './utils';
import Version from './version';
import Config from './config';

export const setupToolbar = Utils.debounce(() => Toolbar.setup(), 500, true);


export function setupEditButton() {
  if (Config) {
    EditBtn.setup(Config);
  }
}


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
  endpoint: Config.baseURL,
};
