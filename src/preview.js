import { preview } from './cookies'
import { removeHash } from './utils'
import { config } from './config'
const { baseURL } = config

export default {

  async setup(corsLink) {

    // Legacy setup
    legacySetup()

    // Get ref
    const ref = await corsLink.get('previewRef')

    // No preview
    if (!ref) return

    // Same preview
    if (ref === preview.get()) return

    // Start preview
    await showPrismicLoader()
    preview.start(ref)

  }

}


// Legacy hash-based setup TODO remove
async function legacySetup() {
  const hash = window.location.hash.match(/prismic-session=([-_a-zA-Z0-9]{16})/)
  const error = msg => console.error(`[prismic.io] Unable to access preview: ${msg}`)
  if (hash) {
    removeHash()
    showPrismicLoader()
    const SESSION = hash[1]
    // Validate
    if (!SESSION || SESSION.length !== 16) return
    // Get ref
    const json = await fetch(`${baseURL}/previews/token/${SESSION}`)
      .then(res => res.json())
      .catch(err => error(`Invalid server response: ${err}`))
    // Set ref & reload
    preview.start(json.ref)
  }
}

// Show prismic loader
function showPrismicLoader() {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('src', `${baseURL}/previews/loading`)
  iframe.style.position = 'fixed'
  iframe.style.right = 0
  iframe.style.left = 0
  iframe.style.top = 0
  iframe.style.bottom = 0
  iframe.style['z-index'] = 2147483000
  iframe.style.width = '100%'
  iframe.style.height = '100%'
  iframe.style.border = 'none'
  iframe.style.opacity = 1
  iframe.style.transition = '.5s opacity'
  return new Promise(resolve => {
    setTimeout(_ => document.body.appendChild(iframe), 0)
    setTimeout(resolve, 1400)
  })
}
