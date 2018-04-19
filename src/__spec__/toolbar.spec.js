// import toolbar from '../toolbar';
// import Cookies from '../cookies';

// TODO not passing tests

// jest.mock('../cookies', () => ({
//   removePreviewCookie: jest.fn(),
//   getPreviewToken: () => 'previewToken',
//   PREVIEW_COOKIE_KEY: 'previewCookieKey',
// }));
//
// describe('closeSession', () => {
//
//   let closeSessionEvent;
//
//   beforeEach(() => {
//     toolbar.setup();
//     closeSessionEvent = new Event('message');
//     closeSessionEvent.data = { type: 'io.prismic.closeSession' };
//   });
//
//   afterEach(() => {
//     Object.defineProperty(document.location, 'hostname', {
//       value: undefined,
//       writable: true,
//     });
//     Object.defineProperty(document.location, 'pathname', {
//       value: undefined,
//       writable: true,
//     });
//   });
//
//   it('should remove cookies for each domain part when path is root', () => {
//     // given
//     const hostname = 'www.myhostname.com';
//     const pathname = '/';
//
//     Object.defineProperty(document.location, 'hostname', {
//       value: hostname,
//       writable: true,
//     });
//     Object.defineProperty(document.location, 'pathname', {
//       value: pathname,
//       writable: true,
//     });
//
//     // when
//     window.dispatchEvent(closeSessionEvent);
//
//     // then
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'www.myhostname.com');
//
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.myhostname.com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'myhostname.com');
//
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/');
//   });
//
//   it('should remove cookies for each domain part and each path part when path is an uri', () => {
//     // given
//     const hostname = 'www.myhostname.com';
//     const pathname = '/a/path';
//
//     Object.defineProperty(document.location, 'hostname', {
//       value: hostname,
//       writable: true,
//     });
//     Object.defineProperty(document.location, 'pathname', {
//       value: pathname,
//       writable: true,
//     });
//
//     // when
//     window.dispatchEvent(closeSessionEvent);
//
//     // then
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'www.myhostname.com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', 'www.myhostname.com');
//
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.myhostname.com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', '.myhostname.com');
//
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'myhostname.com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', 'myhostname.com');
//
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', '.com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', '.com');
//
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/', 'com');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/', 'com');
//
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/');
//     expect(Cookies.removePreviewCookie).toHaveBeenCalledWith('/a/');
//   });
// });
