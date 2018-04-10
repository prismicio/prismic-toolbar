import Preview from './preview'
import { removeHash } from './utils'
import { config } from './config'
const { baseURL } = config


export default {

  // Setup shared preview
  async setup() {

    // Already setup (got ref, same session)
    if (sessionStorage.getItem('prismicPreview')) return

    // TODO LEGACY
    let ref;
    const hash = window.location.hash.match(/prismic-session=([-_a-zA-Z0-9]{16})/)
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
      ref = json.ref
    }
    else {
      ref = await getRef()
    }

    // Already setup (cookie already set)
    if (ref === Preview.get()) return

    if (ref) {
      await showPrismicLoader() // Show loader for 2 seconds
      Preview.close() // Delete old ref
      Preview.set(ref) // Set the ref
      sessionStorage.setItem('prismicPreview', true) // Session now handled
      window.location.reload() // Reload
    }

  }

}


// Get session via iFrame
function getRef() {
  const event = new Promise(resolve => {
    window.addEventListener('message', e => {
      if (e.data.type === 'preview') resolve(e.data.data)
    })
  })
  makeiFrame(`${baseURL}/previews/ref/get`)
  return event
}


// Make hidden iFrame
function makeiFrame(src) {
  const iframe = document.createElement('iframe')
  iframe.src = src
  document.head.appendChild(iframe)
}


// Get cookie
function getCookie(name) {
  var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}


// Handle error
function error(message) {
  console.error(`[prismic.io] Unable to access to preview session: ${message}`)
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
    setTimeout(resolve, 1900)
  })
}
