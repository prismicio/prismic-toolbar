import { corsLink } from './index'
import { reload } from './utils'

export const preview = {
  key: 'io.prismic.preview',
  get: _ => getCookie(preview.key),
  start: val => {
    setCookie(preview.key, val, .1) // prevent bad ref
    reload()
  },
  end: _ => {
    deleteCookie(preview.key)
    corsLink.send('close')
    reload()
  },
}

export const experiment = {
  key: 'io.prismic.experiment',
  get: _ => getCookie(experiment.key),
  start: (expId, variation) => {
    setCookie(experiment.key, [expId, variation].join(' '))
    reload()
  },
  end: _ => {
    deleteCookie(experiment.key)
    reload()
  },
}


function getCookie(name) {
  var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : null;
}

function setCookie(name, value, days) {
  var d = new Date();
  d.setTime(d.getTime() + 24*60*60*1000*days);
  document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString();
}

function deleteCookie(name) {
  setCookie(name, null, -1)
  legacyDeleteCookie(name)
}

// TODO remove
export function legacyDeleteCookie(name) {

  const subdomains = window.location.hostname.split('.') // ['gosport','com']
  const DOMAINS = subdomains
    .map((sub, idx) => '.'+subdomains.slice(idx).join('.')) // .a.b.foo.com
    .slice(0,-1) // no more .com
    .concat(subdomains.join('.')) // website.gosport.com
    .concat(null) // no domain specified

  const subpaths = window.location.pathname.slice(1).split('/') // ['my','path']
  const PATHS = subpaths
    .map((path, idx) => '/'+subpaths.slice(idx).join('/')) // /a/b/foo
    .map((path, idx) => '/'+subpaths.slice(idx).join('/')+'/') // /a/b/foo/
    .concat('/') // root path
    .concat(null) // no path specified

  DOMAINS.forEach(d =>
    PATHS.forEach(p =>
      const path = p ? `path=${p};` : ''
      const domain = d ? `domain=${d};` : ''
      document.cookie = `${name}=;${path}${domain}expires=Thu, 01 Jan 1970 00:00:00 GMT`
    )
  )
}
