import Toolbar from './toolbar';
import EditButton from './editbtn';
import Experiments from './experiments';
import Version from './version';
import { endpoint } from './config';
import { debounced } from './utils';

export const setupToolbar = Toolbar.setup;
export const setupEditButton = EditButton.setup;

export const globals = {
  startExperiment: expId => Experiments.setup(expId),
  setupEditButton, // setupEditButton: Legacy.editButton,
  setup: debounced(200)(Toolbar.setup),
  version: Version.value,
  endpoint,
};
