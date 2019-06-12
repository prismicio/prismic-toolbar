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
      if (parsedCookie) return parsedCookie;
      const converted = this.convertLegacyCookie(cookieOpt);
      return converted;
    }
  }

  set(value) {
    setCookie(PREVIEW_COOKIE_NAME, value);
  }

  build({
    preview,
    tracker
  } = {
    preview: null,
    tracker: null
  }) {
    const previewBlock = (() => {
      if (!preview) return {};
      if (isObject(preview)) return preview;
      return { [this.domain]: { preview } };
    })();
    return Object.assign({}, {
      _tracker: tracker || this.generateTracker()
    }, previewBlock);
  }

  convertLegacyCookie(legacyCookieValue) {
    const cleanedCookie = this.build({
      preview: legacyCookieValue
    });
    this.set(cleanedCookie);
    return cleanedCookie;
  }

  setDefault() {
    const cookieValue = this.build({});
    setCookie(PREVIEW_COOKIE_NAME, cookieValue);
  }

  generateTracker() {
    return random(8);
  }

  upsertPreviewForDomain(previewRef) {
    const cookie = this.get();
    if (cookie) {
      const updatedCookie = this.build({
        preview: previewRef,
        tracker: cookie.tracker
      });
      setCookie(PREVIEW_COOKIE_NAME, updatedCookie);
    } else {
      const compliantCookie = this.build({ preview: previewRef });
      setCookie(PREVIEW_COOKIE_NAME, compliantCookie);
    }
  }

  deletePreviewForDomain() {
    deleteCookie(PREVIEW_COOKIE_NAME);
  }

  getRefForDomain() {
    const cookie = this.get();
    if (!cookie) return;
    return cookie[this.domain] && cookie[this.domain].preview;
  }

  getTracker() {
    const cookie = this.get();
    if (!cookie) return;
    return cookie._tracker;
  }

  refreshTracker() {
    const cookie = this.get();
    if (!cookie) return;
    const updatedCookie = this.build({
      preview: cookie[this.domain].preview,
      tracker: this.generateTracker()
    });
    setCookie(PREVIEW_COOKIE_NAME, updatedCookie);
  }
}
