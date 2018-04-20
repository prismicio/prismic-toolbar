import Puppeteer from 'puppeteer';
import Cookies from '../cookies';

describe('Cookies', () => {
  it('removePreviewCookie should remove cookies for all domain/path combinations.', async () => {
    // Set up puppeteer
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://github.com/prismicio/prismic-toolbar');

    // Expose functions
    await page.exposeFunction('setCookie', setCookie);
    await page.exposeFunction('cookieExists', cookieExists);
    await page.exposeFunction('removePreviewCookie', Cookies.removePreviewCookie);

    // Set preview cookies
    let cookie = await page.evaluate(() => {
      setCookie('io.prismic.preview', 'foo', '.blog.gosport.com', '/post');
      setCookie('io.prismic.preview', 'foo', 'blog.gosport.com', '/post/some-thing/');
      setCookie('io.prismic.preview', 'foo', '.gosport.com', '/');
      setCookie('io.prismic.preview', 'foo', 'gosport.com', null);
      setCookie('io.prismic.preview', 'foo', null, '/');
      return cookieExists('io.prismic.preview');
    });

    // Test
    expect(cookie).toBeTruthy();

    // Remove all preview cookies
    cookie = await page.evaluate(() => {
      removePreviewCookie(); // eslint-disable-line
      return cookieExists('io.prismic.preview');
    });

    // Test
    expect(cookie).toBeFalsy();

    // Close puppeteer
    await browser.close();
  });
});


function cookieExists(cookie) {
  return document.cookie.includes(cookie);
}


function setCookie(name = null, value = null, domain = null, path = '/', expires = 1000) {
  if (!name) throw new Error('setCookie: no name specified');
  const c = `${name}=${value};`;
  const p = path ? `path=${path};` : '';
  const d = domain ? `domain=${domain};` : '';
  const e = `expires=${new Date(Date.now() + (1000 * 60 * 60 * 24 * expires)).toGMTString()}`;
  document.cookie = c + p + d + e;
}
