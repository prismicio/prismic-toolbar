import { getCookie, setCookie, deleteCookie } from '@common';

const EXPERIMENT_COOKIE_NAME = 'io.prismic.experiment';

export class ExperimentCookie {
  get() {
    return getCookie(EXPERIMENT_COOKIE_NAME);
  }

  set(expId, variation) {
    const value = [expId, variation].join(' ');
    setCookie(EXPERIMENT_COOKIE_NAME, value);
  }

  delete() {
    deleteCookie(EXPERIMENT_COOKIE_NAME);
  }
}
