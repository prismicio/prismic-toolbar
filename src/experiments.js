import Cookies from './cookies';

export default {

  start(googleId) {

    loadGoogleExperimentScript(googleId, _ => {

      // Check if cookies are enabled
      if (!navigator.cookieEnabled) return

      // Don't experiment in preview mode
      if (Cookies.getPreviewToken()) return

      // Get experiment
      const inCookie = (Cookies.getExperimentToken() || '').split(' ');
      const googleVariation = window.cxApi.chooseVariation();

      // Not participating
      if (googleVariation === window.cxApi.NOT_PARTICIPATING) return Cookies.removeExperimentToken();

      // ???
      if (inCookie[0] !== googleId || inCookie[1] !== googleVariation.toString()) {
        Cookies.setExperimentToken(googleId, googleVariation);
        window.location.reload();
      }

    });

  }

};


function loadGoogleExperimentScript(googleId, callback) {
  const src = `//www.google-analytics.com/cx/api.js?experiment=${googleId}`;
  const alreadyExists = document.querySelector(`[src="${src}"]`);

  if (alreadyExists) return callback();

  const script = document.createElement('script');
  script.src = src;
  script.onload = callback;
  document.head.appendChild(script);
}
