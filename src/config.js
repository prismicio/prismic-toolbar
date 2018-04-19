import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Utils from './utils';
import Version from './version';

const PRISMIC_ENDPOINT = window.prismic && window.prismic.endpoint;
export let START_EXPERIMENT = () => {};

export const config = (() => {
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
    return {
      baseURL,
      editorTab,
      location,
    };
  }
  return null;
})();

export const setupToolbar = Utils.debounce(() => Toolbar.setup(), 500, true);

export const corsLink = config && Utils.iFrame(`${config.baseURL}/previews/messenger`);

export function setupEditButton() {
  if (config) {
    EditBtn.setup(config);
  }
}

function startExperiment(expId) {
  if (expId) {
    START_EXPERIMENT = () => Experiments.start(expId);
  }
}

export const globals = {
  setup: setupToolbar,
  startExperiment,
  setupEditButton,
  version: Version.value,
  endpoint: PRISMIC_ENDPOINT,
};
