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
}
