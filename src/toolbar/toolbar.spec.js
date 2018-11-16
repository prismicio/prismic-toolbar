import Puppeteer from 'puppeteer';
import { demolishCookie } from 'common';

describe('Cookies',_ => {
  it('demolishCookie should remove cookies for all domain/path combinations.', async _ => {
    // Set up puppeteer
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://www.awwwards.com/websites/');

    // Expose functions
    await page.exposeFunction('setCookie', setCookie);
    await page.exposeFunction('cookieExists', cookieExists);
    await page.exposeFunction('demolishCookie', demolishCookie);

    // Set preview cookies
    let cookie = await page.evaluate(_ => {
      setCookie('io.prismic.preview', 'foo', '.www.awwwards.com', '/websites');
      setCookie('io.prismic.preview', 'foo', 'www.awwwards.com', '/websites/');
      setCookie('io.prismic.preview', 'foo', '.awwwards.com', '/');
      setCookie('io.prismic.preview', 'foo', 'awwwards.com', null);
      setCookie('io.prismic.preview', 'foo', null, '/');
      return cookieExists('io.prismic.preview');
    });

    // Test
    expect(cookie).toBeTruthy();

    // Remove all preview cookies
    cookie = await page.evaluate(_ => {
      demolishCookie();
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
  const e = `expires=${new Date(
    Date.now() + 1000 * 60 * 60 * 24 * expires
  ).toGMTString()}`;
  document.cookie = c + p + d + e;
}
