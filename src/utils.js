import Config from './config'

// Authenticate
export async function authenticate() {
  const response = await fetch(`${Config.config.baseURL}/app/authenticated/v2`, {credentials: 'include'})

  // Didn't receive JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || contentType.indexOf('application/json') === -1) return null

  return await response.json().userId
}


// Remove #... in url
export function removeHash() {
  window.history.pushState("", document.title, window.location.pathname + window.location.search)
}


// From underscore.js
export function debounce(func, wait, immediate) {
  let timeout;
  return (...args) => {
    const context = this;
    const later = _ => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}


// Handle io.prismic.* messages
export function onPrismic(type, handler) {
  handlers.push({ type, func:handler })
}

// onPrismic helper
const handlers = []
window.addEventListener('message', e => {

  const isPrismicMsg = e.data.type && e.data.type.match(/^io\.prismic\.(\w+)$/)
  if (!isPrismicMsg) return

  const msgType = isPrismicMsg[1]
  const msgData = e.data.data

  handlers.forEach(h => msgType === h.type && h.func(msgData))

})
