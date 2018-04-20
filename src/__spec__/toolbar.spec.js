// import Cookies from '../cookies'; // TODO part of the function is in /preview....

// TODO not passing tests
describe('removeCookie', () => {
  it('should remove cookies for all domain/path combinations.', () => {
    global.window.prismic.endpoint = 'http://foyer-demo.prismic.io';
    setCookie('name', 'value', 'domain', 'path', 'expires');
    setCookie('name', 'value', 'domain', 'path', 'expires');
    setCookie('name', 'value', 'domain', 'path', 'expires');
    setCookie('name', 'value', 'domain', 'path', 'expires');
    removeCookie('cookiename');
    expect('cookie to begone!');
  });
});

// function setCookie(name, value, domain, path, expires) {
//
// }
//
// function deleteCookie() {
//
// }
