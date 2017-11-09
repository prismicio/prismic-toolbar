import toolbar from '../toolbar';
import coookies from '../coookies';

jest.mock('../coookies', () => ({
  removeItem: jest.fn(),
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

  afterEach(() => {
    Object.defineProperty(document.location, 'hostname', {
      value: undefined,
      writable: true,
    });
    Object.defineProperty(document.location, 'pathname', {
      value: undefined,
      writable: true,
    });
  });

  it('should remove cookies for each domain part when path is root', () => {
    // given
    const hostname = 'www.myhostname.com';
    const pathname = '/';

    Object.defineProperty(document.location, 'hostname', {
      value: hostname,
      writable: true,
    });
    Object.defineProperty(document.location, 'pathname', {
      value: pathname,
      writable: true,
    });

    // when
    window.dispatchEvent(closeSessionEvent);

    // then
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', 'www.myhostname.com');

    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', '.myhostname.com');
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', 'myhostname.com');

    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', '.com');
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', 'com');
  });

  it('should remove cookies for each domain part and each path part when path is an uri', () => {
    // given
    const hostname = 'www.myhostname.com';
    const pathname = '/a/path';

    Object.defineProperty(document.location, 'hostname', {
      value: hostname,
      writable: true,
    });
    Object.defineProperty(document.location, 'pathname', {
      value: pathname,
      writable: true,
    });

    // when
    window.dispatchEvent(closeSessionEvent);

    // then
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', 'www.myhostname.com');
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/a/', 'www.myhostname.com');

    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', '.myhostname.com');
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/a/', '.myhostname.com');

    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', 'myhostname.com');
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/a/', 'myhostname.com');

    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', '.com');
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/a/', '.com');

    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/', 'com');
    expect(coookies.removeItem).toHaveBeenCalledWith('previewCookieKey', '/a/', 'com');
  });
});
