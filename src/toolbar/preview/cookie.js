import { getCookie, setCookie, demolishCookie, isObject } from '@common';
import { random } from '../../common/general';

const PREVIEW_COOKIE_NAME = 'io.prismic.preview';

// Preview cookie manager for a specific repository (safe to have multiple instances)
export class PreviewCookie {
  constructor(isAuthenticated) {
    this.isAuthenticated = isAuthenticated;
  }

  init(domain, ref) {
    const hasConvertCookie = this.convertLegacy(domain, ref);
    if (hasConvertCookie) return { convertedLegacy: true };

    const currentCookie = this.get();
    const value = Object.assign({}, currentCookie, this.buildPreview({ [domain]: ref }));

    this.set(value);
    return { convertedLegacy: false };
  }

  convertLegacy(domain, legacyValue) {
    const cookieOpt = getCookie(PREVIEW_COOKIE_NAME);
    if (cookieOpt) {
      const parsedCookie = (() => {
        try {
          return JSON.parse(cookieOpt);
        } catch (e) {
          return null;
        }
      })();
      if (parsedCookie) return false;
      const cleanedCookie = this.build({
        tracker: this.generateTracker(),
        previewByDomain: { [domain]: legacyValue }
      });
      this.set(cleanedCookie);
      return true;
    }
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
      return null;
    }
  }

  set(value) {
    if (value) setCookie(PREVIEW_COOKIE_NAME, value);
    else demolishCookie(PREVIEW_COOKIE_NAME);
  }

  buildPreview(previewByDomain) {
    if (isObject(previewByDomain)) {
      return Object.keys(previewByDomain)
        .map(domain => ({ [domain]: { preview: previewByDomain[domain] } }))
        .reduce((formattedPreviewByDomain, acc) => (
          Object.assign({}, acc, formattedPreviewByDomain)
        ), {});
    }
    return null;
  }

  build({
    tracker,
    previewByDomain
  } = {
    tracker: null,
    previewByDomain: null
  }) {
    const previewBlock = this.buildPreview(previewByDomain);

    const trackerBlock = (() => {
      if (!this.isAuthenticated) return;
      if (!tracker) return;
      return { _tracker: tracker };
    })();

    if (previewBlock || trackerBlock)
      return Object.assign({}, trackerBlock || {}, previewBlock || {});
  }

  generateTracker() {
    return random(8);
  }

  upsertPreviewForDomain(domain, previewRef) {
    const tracker = (() => {
      const c = this.get();
      return c && c._tracker;
    })();
    const updatedCookieValue = this.build({ tracker, previewByDomain: { [domain]: previewRef } });
    this.set(updatedCookieValue);
  }

  deletePreviewForDomain(domain) {
    const cookie = this.get();
    delete cookie[domain];
    this.set(cookie);
  }

  getRefForDomain(domain) {
    const cookie = this.get();
    if (!cookie) return;
    return cookie[domain] && cookie[domain].preview;
  }

  getTracker() {
    const cookie = this.get();
    if (!cookie) return;
    return cookie._tracker;
  }

  refreshTracker() {
    const c = this.get();
    const updatedCookie = Object.assign({}, c, { _tracker: this.generateTracker() });
    this.set(updatedCookie);
  }
}
