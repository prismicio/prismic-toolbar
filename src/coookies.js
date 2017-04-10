const PREVIEW_COOKIE_KEY = 'io.prismic.preview';
const EXPERIMENT_COOKIE_KEY = 'io.prismic.experiment';

// https://developer.mozilla.org/en-US/docs/DOM/document.cookie:

function getItem(sKey) {
  return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*\"?([^;]*)\"?.*$)|^.*$"), '$1')) || null;
}

function setItem(sKey, sValue, vEnd, sPath, sDomain, bSecure) {
  if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
    return false;
  }
  let sExpires = '';
  if (vEnd) {
    switch(vEnd.constructor) {
      case Number:
        sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
        break;
      case String:
        sExpires = "; expires=" + vEnd;
        break;
      case Date:
        sExpires = "; expires=" + vEnd.toUTCString();
        break;
    }
  }
  document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
  return true;
}

function hasItem(sKey) {
  if (!sKey) { return false; }
  return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
}

function removeItem(sKey, sPath, sDomain) {
  if (!hasItem(sKey)) { return false; }
  var cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
  document.cookie = cookie;
  return true;
}

function supportCookies() {
  // check that the browser supports setting cookies
  if (!navigator.cookieEnabled) return false;
  document.cookie = "__verify=1";
  var supportsCookies = document.cookie.length >= 1 && document.cookie.indexOf("__verify=1") !== -1;
  // now delete the cookie
  var thePast = new Date(2010, 1, 1);
  document.cookie = "__verify=1;expires=" + thePast.toUTCString();
  if (!supportsCookies) return false;
  return true;
}

export default {
  PREVIEW_COOKIE_KEY,
  EXPERIMENT_COOKIE_KEY,
  getPreviewToken() {
    return getItem(PREVIEW_COOKIE_KEY);
  },
  getExperimentToken() {
    return getItem(EXPERIMENT_COOKIE_KEY);
  },
  removeExperimentToken() {
    removeItem(EXPERIMENT_COOKIE_KEY);
  },
  setExperimentToken(expId, variation) {
    const token = [expId, variation].join(' ');
    const expire = 60 * 60 * 24 * 30;
    setItem(EXPERIMENT_COOKIE_KEY, token, expire, '/');
  },
  getItem,
  setItem,
  removeItem,
  supportCookies,
  hasItem,
};
