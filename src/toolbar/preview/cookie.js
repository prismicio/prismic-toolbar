import { getCookie, setCookie, demolishCookie, isObject } from '@common';
import { random } from '../../common/general';
import { clearDirectPreviewRef, getDirectPreviewState } from '../direct-preview-watch';

const PREVIEW_COOKIE_NAME = 'io.prismic.preview';

// Preview cookie manager for a specific repository (safe to have multiple instances)
export class PreviewCookie {
  constructor(isAuthenticated, domain) {
    this.isAuthenticated = isAuthenticated;
    this.domain = domain;
  }

  // Align the site cookie with `ref`. Returns true when the page should reload.
  sync(ref) {
    if (this.isControlledByEditor()) return false;
    if (this.convertLegacyCookieIfNeeded()) return true;

    const upToDate = ref === this.getRefForDomain();
    this.upsertPreviewForDomain(ref);
    return !upToDate;
  }

  convertLegacyCookieIfNeeded() {
    const cookieOpt = getCookie(PREVIEW_COOKIE_NAME);
    if (!cookieOpt) return false;

    try {
      JSON.parse(cookieOpt);
      return false;
    } catch (e) {
      this.convertLegacyCookie(cookieOpt);
      return true;
    }
  }

  get() /* Object | string */ {
    const directPreview = getDirectPreviewState();
    if (directPreview) {
      // Present the regular cookie API without converting the shared raw cookie
      // or downgrading its cross-site attributes from an authenticated site tab.
      return { [directPreview.repository]: { preview: directPreview.ref } };
    }

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
    if (this.isControlledByEditor()) return;
    if (value) setCookie(PREVIEW_COOKIE_NAME, value);
    else demolishCookie(PREVIEW_COOKIE_NAME);
  }

  build({
    preview,
    tracker
  } = {
    preview: null,
    tracker: null
  }) {
    const previewBlock = (() => {
      // copy previews and delete the current one before rebuilding it
      if (!preview) return;
      if (isObject(preview)) return preview;
      return { [this.domain]: { preview } };
    })();

    const trackerBlock = (() => {
      if (!this.isAuthenticated) return;
      if (!tracker) return;
      return { _tracker: tracker || this.generateTracker() };
    })();

    if (previewBlock || trackerBlock)
      return Object.assign({}, trackerBlock || {}, previewBlock || {});
  }

  convertLegacyCookie(legacyCookieValue) {
    const cleanedCookie = this.build({
      tracker: this.generateTracker(),
      preview: legacyCookieValue
    });
    this.set(cleanedCookie);
    return cleanedCookie;
  }

  generateTracker() {
    return random(8);
  }

  upsertPreviewForDomain(previewRef) {
    const tracker = (() => {
      const c = this.get();
      return c && c._tracker;
    })();
    const updatedCookieValue = this.build({ tracker, preview: previewRef });
    this.set(updatedCookieValue);
  }

  deletePreviewForDomain() {
    const directPreview = getDirectPreviewState();
    if (directPreview) {
      if (directPreview.repository !== this.domain) return;
      clearDirectPreviewRef();
    }
    const updatedCookieValue = this.build();
    this.set(updatedCookieValue);
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

  isControlledByEditor() {
    return Boolean(getDirectPreviewState());
  }

  refreshTracker() {
    const ref = this.getRefForDomain();
    const updatedCookie = this.build({ preview: ref, tracker: this.generateTracker() });
    this.set(updatedCookie);
  }
}
