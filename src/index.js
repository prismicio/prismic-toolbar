import Toolbar from './toolbar';
import EditBtn from './editbtn';
import Experiments from './experiments';
import Utils from './utils';
import Version from './version';
import Share from './share';


// window.prismic setup
let _startExperiment = null;
const setup = Utils.debounce(() => Toolbar.setup(), 500, true);
const setupEditButton = _ => config && EditBtn.setup(config);
const startExperiment = expId => { if (expId) _startExperiment = _ => Experiments.start(expId) };
const version = Version.value;
const endpoint = window.prismic && window.prismic.endpoint.replace(/\.cdn\.prismic\.io/, '.prismic.io');

window.prismic = { setup, setupEditButton, startExperiment, version, endpoint };


// config
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


// session iFrame
const iframe = document.createElement('iframe');
iframe.src = `${config.baseURL}/previews/session/get`;
iframe.style.display = 'none';
setTimeout(_ => document.body.appendChild(iframe), 0); // script ran before body rendered


// listen to session iframe
window.addEventListener('message', e => {

  if (e.data.type !== 'preview') return;

  window.prismicSession = e.data.data;

  if (!config) return;

  Share.listen(config, _ => {
    _startExperiment && _startExperiment();
    setup();
    setupEditButton();
  });

})
