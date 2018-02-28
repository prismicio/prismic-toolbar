import Cookies from './cookies';

function loadGoogleExperimentScript(googleId, callback) {
  const src = `//www.google-analytics.com/cx/api.js?experiment=${googleId}`;
  const alreadyExists = document.querySelector(`[src="${src}"]`);

  if (alreadyExists) {
    callback();
  } else {
    const head = document.querySelector('head');
    const script = document.createElement('script');
    let loaded = false;
    const onLoaded = function onLoaded() {
      if (!loaded && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
        loaded = true;
        callback();
        script.onload = undefined;
        script.onreadystatechange = undefined;
      }
    };
    script.onload = onLoaded;
    script.onreadystatechange = onLoaded;
    script.src = src;
    head.appendChild(script);
  }
}

function start(googleId) {
  loadGoogleExperimentScript(googleId, () => {
    try {
      const previewToken = Cookies.getPreviewToken();
      if (!previewToken) {
        const inCookie = (Cookies.getExperimentToken() || '').split(' ');
        const googleVariation = window.cxApi.chooseVariation();
        if (googleVariation === window.cxApi.NOT_PARTICIPATING) {
          Cookies.removeExperimentToken();
          return;
        }
        if (inCookie[0] !== googleId || inCookie[1] !== googleVariation.toString()) {
          Cookies.setExperimentToken(googleId, googleVariation);
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
