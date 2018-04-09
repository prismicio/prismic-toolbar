import Preview from './preview'
import { removeHash } from './utils'
import { config } from './config'
const { baseURL } = config


export default {

  // Setup shared preview
  async setup() {

    // Legacy
    const hash = window.location.hash.match(/prismic-session=([-_a-zA-Z0-9]{16})/)
    hash && removeHash()

    // Get session
    const SESSION = hash ? hash[1] : await getSession()

    // Validate session
    const validSession = SESSION && SESSION.length === 16
    const handledSession = sessionStorage.getItem('prismicPreview')
    if (!validSession || handledSession) return

    // Show loader
    await prismicLoader()

    // Get ref from session
    const json = await fetch(`${baseURL}/previews/token/${SESSION}`)
      .then(res => res.json())
      .catch(err => error(`Invalid server response: ${err}`))

    if (json.ref) { // If current ref for session
      Preview.close()
      Preview.set(json.ref) // Set the ref
      sessionStorage.setItem('prismicPreview', true) // Session now handled
      window.location.reload() // Reload
    }
    else error('Invalid session')

  }

}


// Get session via iFrame
function getSession() {
  const event = new Promise(resolve => {
    window.addEventListener('message', e => {
      if (e.data.type === 'preview') resolve(e.data.data)
    })
  })

  const iframe = document.createElement('iframe')
  iframe.src = `${baseURL}/previews/session/get`
  iframe.style.display = 'none'
  document.head.appendChild(iframe)

  return event
}


// Handle error
function error(message) {
  console.error(`[prismic.io] Unable to access to preview session: ${message}`)
}


// Show prismic loader
function prismicLoader() {
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
