import Experiments from './experiments';
import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Version from './version';
import { debounce } from './utils';


const setupToolbar = debounce(_ => Toolbar.setup(), 500, true);

const setupEditButton = _ => config && EditBtn.setup(config);

let _startExperiment = _ => _;
const startExperiment = expId => _startExperiment = expId ? _ => Experiments.start(expId) : _ => _;

const version = Version.value;

const endpoint = window.prismic && window.prismic.endpoint.replace(/\.cdn\.prismic\.io/, '.prismic.io');

const config = (_ => {
  if (!endpoint) return null;
  const urlComponents = endpoint.match(new RegExp('https?://([^/]*)'));
  if (!urlComponents[1]) return null;
  return {
    baseURL: urlComponents[0], // "http://foyer-demo.wroom.test"
    editorTab: urlComponents[1], // "foyer-demo.wroom.test"
    location: {
      origin: window.location.origin,
      hash: window.location.hash, // "http://localhost:3000"
      pathname: window.location.pathname, // "/fr-lu/page/foyer-voyage"
      search: window.location.search,
    }
  }
})();


// For internal use
export { config, setupToolbar, setupEditButton, _startExperiment as setupExperiment };

// For developers
export const globals = { setup:setupToolbar, setupEditButton, startExperiment, version, endpoint };
