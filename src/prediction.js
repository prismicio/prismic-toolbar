import Config from './config';
import { query, PreviewCookie, Hooks, random } from './helpers';

const cookie = new PreviewCookie();
const hooks = new Hooks();
let breakInterval;

// TODO auth only

async function setup() {
  // Manage cookie
  const pageCookie = cookie.query;
  cookie.track = random(8);
  clearInterval(breakInterval); // Teardown
  breakInterval = setInterval(() => (cookie.breaker = random(6)), 100);

  // Predict
  const url = window.location.pathname;
  const { track, breaker } = pageCookie;
  const qs = query({ url, track, breaker });
  const endpoint = `${Config.baseURL}/prediction/predict?${qs}`;
  const prediction = await fetch(endpoint).then(r => r.json());
  console.log('prediction', prediction);

  // Hooks
  hooks.off('beforeRequest'); // Teardown
  hooks.off('afterRequest'); // Teardown
  hooks.on('beforeRequest', () => (cookie.url = url));
  hooks.on('afterRequest', () => (cookie.url = null));
}

export default {
  setup,
};
