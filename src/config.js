import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import { debounce } from './utils';
import Version from './version';


const setupToolbar = debounce(_ => Toolbar.setup(), 500, true);

const setupEditButton = _ => config && EditBtn.setup(config);

let _startExperiment;
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


export default { setup:setupToolbar, setupEditButton, startExperiment, _startExperiment, version, endpoint, config };
