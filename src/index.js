import Messenger from './messenger'
import Preview from './preview'
import { globals, setupExperiment, setupToolbar, setupEditButton } from './config'
import { readyDOM } from './utils'
import { config } from './config'
const { baseURL } = config

// Prismic iFrame
export const corsLink = new Messenger(`${baseURL}/previews/messenger`)

// Setup
;(async _ => {

  window.prismic = globals
  await Preview.setup(corsLink)
  await readyDOM()
  setupExperiment()
  setupToolbar()
  setupEditButton()

})()
