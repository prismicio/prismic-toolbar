import { experiment } from './cookies'
import { reload } from './utils';

export default {

  async start(googleId) {

    // Load experiment script
    await loadGoogleExperimentScript(googleId)

    // If cookies not enabled
    if (!navigator.cookieEnabled) return

    // Get experiment
    const [id, variation] = (experiment.get() || '').split(' ')
    const googleVariation = window.cxApi.chooseVariation()

    // Not participating
    if (googleVariation === window.cxApi.NOT_PARTICIPATING && id) experiment.end()

    // Check if new experiment
    const newId = id !== googleId
    const newVariation = variation !== googleVariation.toString()

    // Initiate experiment
    if (newId || newVariation) {
      experiment.start(googleId, googleVariation)
      reload()
    }

  }

}


function loadGoogleExperimentScript(googleId) {
  return new Promise(resolve => {

    const src = `//www.google-analytics.com/cx/api.js?experiment=${googleId}`
    const alreadyExists = document.querySelector(`[src="${src}"]`)

    if (alreadyExists) return resolve()

    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    document.head.appendChild(script)

  })
}
