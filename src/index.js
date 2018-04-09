import Share from './share'
import { globals, startExperiment, setupToolbar, setupEditButton } from './config'


// For developers
window.prismic = globals;


// Initialize
(async _ => {
  await Share.setup()
  setTimeout(_ => {
    startExperiment()
    setupToolbar()
    setupEditButton()
  }, 0)
})()
