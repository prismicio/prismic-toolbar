import { getCookie, setCookie, query, parseQuery } from '.'

// Preivew cookie helper
export class PreviewCookie {
  name = 'io.prismic.preview'

  get ref() {
    const cookie = getCookie(this.name) || ''
    return cookie.split('?')[0] || ''
  }

  set ref(value) {
    setCookie(this.name, value + '?' + this.query)
  }

  get query() {
    const cookie = getCookie(this.name) || ''
    return parseQuery(cookie)
  }

  set query(obj) {
    setCookie(this.name, this.ref + '?' + query(truthyObject(obj)))
  }

  get url() {
    return this.query.url
  }

  set url(value) {
    this.query = {...this.query, url:value}
  }

  get track() {
    return this.query.track
  }

  set track(value) {
    this.query = {...this.query, track:value}
  }

  get breaker() {
    return this.query.breaker
  }

  set breaker(value) {
    this.query = {...this.query, breaker:value}
  }
}

// Object filtered by truthy values
function truthyObject(obj) {
  return Object.entries(obj).reduce((acc, curr) => {
    if (curr[1]) acc[curr[0]] = curr[1]
    return acc
  }, {})
}
