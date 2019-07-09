import { getCookie, setCookie, isObject } from '@common';
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
    const trackerOrFallback = tracker || this.generateTracker();
    const previewBlock = (() => {
      if (!preview) return {};
      if (isObject(preview)) return preview;
      return { [this.domain]: { preview } };
    })();
    return Object.assign({}, {
      _tracker: trackerOrFallback
    }, previewBlock);
  }

  convertLegacyCookie(legacyCookieValue) {
    const cleanedCookie = this.build({
      tracker: this.generateTracker(),
      preview: legacyCookieValue
    });
    this.set(cleanedCookie);
    return cleanedCookie;
  }

  setDefault() {
    const tracker = this.getTracker();
    const cookieValue = this.build(Object.assign({}, tracker ? { tracker } : {}));
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
        tracker: cookie._tracker
      });
      setCookie(PREVIEW_COOKIE_NAME, updatedCookie);
    } else {
      const compliantCookie = this.build({ preview: previewRef, tracker: this.generateTracker() });
      setCookie(PREVIEW_COOKIE_NAME, compliantCookie);
    }
  }

  deletePreviewForDomain() {
    const cookie = this.get();
    if (cookie) {
      const updatedCookie = this.build({
        tracker: cookie._tracker
      });
      setCookie(PREVIEW_COOKIE_NAME, updatedCookie);
    } else {
      const compliantCookie = this.build({ tracker: this.generateTracker() });
      setCookie(PREVIEW_COOKIE_NAME, compliantCookie);
    }
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
      preview: cookie[this.domain] && cookie[this.domain].preview,
      tracker: this.generateTracker()
    });
    setCookie(PREVIEW_COOKIE_NAME, updatedCookie);
  }
}
