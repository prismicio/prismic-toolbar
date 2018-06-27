import Config from './config';
import { query, PreviewCookie, Hooks, random } from './helpers'
const cookie = new PreviewCookie()
const hooks = new Hooks()
let breakInterval

// TODO auth only

async function setup() {
  // Manage cookie
  let pageCookie = cookie.query
  cookie.track = random(8)
  clearInterval(breakInterval) // Teardown
  breakInterval = setInterval(_ => cookie.breaker = random(6), 100)

  // Predict
  const url = window.location.pathname
  const { track, breaker } = pageCookie
  const endpoint = `${Config.baseURL}/prediction/predict?${query({ url, track, breaker })}`
  const prediction = await fetch(endpoint).then(r => r.json())
  console.log('prediction', prediction)

  // Hooks
  hooks.off('beforeRequest') // Teardown
  hooks.off('afterRequest') // Teardown
  hooks.on('beforeRequest', _ => cookie.url = url)
  hooks.on('afterRequest', _ => cookie.url = null)
}

export default {
  setup,
};
