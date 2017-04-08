import coookies from './coookies';

function loadGoogleExperimentScript(googleId, callback) {
  const src = `//www.google-analytics.com/cx/api.js?experiment=${googleId}`;
  const alreadyExists = document.querySelector(`[src="${src}"]`);

  if (alreadyExists) {
    callback(window.cxApi);
  } else {
    const head = document.querySelector('head');
    const script = document.createElement('script');
    let loaded = false;
    script.onload = script.onreadystatechange = function onLoaded() {
      if (!loaded && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
        loaded = true;
        callback(window.cxApi);
        script.onload = script.onreadystatechange = undefined;
      }
    };
    script.src = src;
    head.appendChild(script);
  }
}

function start(googleId) {
  loadGoogleExperimentScript(googleId, (cxApi) => {
    try {
      if (!coookies.supportCookies()) return;
      const previewToken = coookies.getPreviewToken();
      if (!previewToken) {
        const inCookie = (coookies.getExperimentToken() || '').split(' ');
        const googleVariation = cxApi.chooseVariation();
        if (googleVariation === cxApi.NOT_PARTICIPATING) { // remove cookie here?
          return;
        }
        if (inCookie[0] !== googleId || inCookie[1] !== googleVariation.toString()) {
          coookies.setExperimentToken(googleId, googleVariation);
          window.location.reload();
        }
      }
    } catch (e) {
      // cookies may be disabled, fail silently
    }
  });
}

export default {
  start,
};
