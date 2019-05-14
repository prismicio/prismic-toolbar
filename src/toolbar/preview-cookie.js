import { getCookie, setCookie, deleteCookie, isObject } from '@common';

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

  build() {
    return {
      _breaker: 'string',
      _tracker: 'string',
      _url: 'string',
      [domain]: {
        preview: 'string'
      }
    }
  }

  appendPreviewForDomain(domain, previewRef) {
    const cookieData = this.get();
    if(!cookieData.legacy) {
      const updated = Object.assign({}, cookieData.cookie, { [domain]: }
    }

  }

  deletePreviewForDomain(domain) {
    const cookie = this.get();

  }

  delete() {}
}