import { getCookie, setCookie, deleteCookie, isObject } from '@common';
import { random } from '../../common/general';

const PREVIEW_COOKIE_NAME = 'io.prismic.preview';

// Preview cookie manager for a specific repository (safe to have multiple instances)
export class PreviewCookie {
  constructor(domain) {
    this.domain = domain;
  }

  get() /* Object | string */ {
    const cookieOpt = getCookie(PREVIEW_COOKIE_NAME);
    if (cookieOpt) {
      const parsedCookie = (() => {
        try {
          return JSON.parse(cookieOpt);
        } catch (e) {
          return null;
        }
      })();
      if (parsedCookie) return {
        legacy: false,
        cookie: parsedCookie
      };
      return {
        legacy: true,
        cookie: cookieOpt
      }; // Legacy cookie with ref as String
    }
  }

  set(value) {
    setCookie(PREVIEW_COOKIE_NAME, value);
  }

  build({
    preview,
    url,
    tracker,
    breaker
  } = {
    preview: null,
    url: null,
    tracker: null,
    breaker: null
  }) {
    const urlBlock = url ? { _url: url } : {};
    const previewBlock = (() => {
      if (!preview) return {};
      if (isObject(preview)) return preview;
      return { [this.domain]: preview };
    })();
    return Object.assign({}, {
      _breaker: breaker || this.generateBreaker(),
      _tracker: tracker || this.generateTracker()
    }, urlBlock, previewBlock);
  }

  generateTracker() {
    return random(8);
  }

  generateBreaker() {
    return random(8);
  }

  upsertPreviewForDomain(previewRef) {
    const cookieData = this.get();
    if (!cookieData.legacy) {
      const updatedCookie = Object.assign({}, cookieData.cookie, { [this.domain]: previewRef });
      setCookie(PREVIEW_COOKIE_NAME, updatedCookie);
    } else {
      const compliantCookie = this.build({ preview: cookieData });
      setCookie(PREVIEW_COOKIE_NAME, compliantCookie);
    }
  }

  deletePreviewForDomain() {
    deleteCookie(PREVIEW_COOKIE_NAME);
  }

  getRefForDomain() {
    const cookieData = this.get();
    if (cookieData.legacy) return cookieData.cookie;
    return cookieData.cookie.preview[this.domain];
  }

  getTracker() {
    const cookieData = this.get();
    if (!cookieData.legacy) return cookieData.cookie._tracker;
  }

  getBreaker() {
    const cookieData = this.get();
    if (!cookieData.legacy) return cookieData.cookie._breaker;
  }

  refreshBreaker() {
    const cookieData = this.get();
    if (!cookieData.legacy) {
      const updatedCookie = Object.assign(
        {},
        cookieData.cookie,
        { _breaker: this.generateBreaker() }
      );
      setCookie(PREVIEW_COOKIE_NAME, updatedCookie);
    }
  }
}
