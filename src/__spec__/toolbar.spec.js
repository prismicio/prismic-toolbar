'use strict'

import toolbar from '../toolbar';
import Cookies from '../cookies';

jest.mock('../cookies', () => ({
  removePreviewCookie: jest.fn(),
  getPreviewToken: () => 'previewToken',
  PREVIEW_COOKIE_KEY: 'previewCookieKey',
}));

describe('closeSession', () => {

  let closeSessionEvent;

  beforeEach(() => {
    toolbar.setup();
    closeSessionEvent = new Event('message');
    closeSessionEvent.data = { type: 'io.prismic.closeSession' };
  });

  it('should remove cookies for each domain part when path is root', () => {
    // given
    const hostname = 'www.myhostname.com';
    const pathname = '/';

    jsdom.reconfigure({
      url: `http://${hostname}${pathname}`,
    });

    // when
    window.dispatchEvent(closeSessionEvent);

    // then
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'www.myhostname.com');

    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.myhostname.com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'myhostname.com');

    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/');
  });

  it('should remove cookies for each domain part and each path part when path is an uri', () => {
    // given
    const hostname = 'www.myhostname.com';
    const pathname = '/a/path';

    jsdom.reconfigure({
      url: `http://${hostname}${pathname}`,
    });

    // when
    window.dispatchEvent(closeSessionEvent);

    // then
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'www.myhostname.com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', 'www.myhostname.com');

    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.myhostname.com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', '.myhostname.com');

    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'myhostname.com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', 'myhostname.com');

    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', '.com');

    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'com');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', 'com');

    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/');
    expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/');
  });
});
