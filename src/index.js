import Share from './share'
import Config from './config'


// Set global
window.prismic = Config;


// Initialize
(async _ => {
  await Share.setup()
  setTimeout(_ => {
    Config.startExperiment()
    Config.setup()
    Config.setupEditButton()
  }, 0)
})()
