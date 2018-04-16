import { legacyDeleteCookie, deleteCookieAllPathsDomains } from './cookies'

describe('closeSession', () => {

  it('should remove cookies for each domain part when path is root', () => {
    // given
    const hostname = 'www.myhostname.com'
    const pathname = '/'

    Object.defineProperty(document.location, 'hostname', {
      value: hostname,
      writable: true,
    })
    Object.defineProperty(document.location, 'pathname', {
      value: pathname,
      writable: true,
    })

    // when
    legacyDeleteCookie('foo')

    // then
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', 'www.myhostname.com')

    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', '.myhostname.com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', 'myhostname.com')

    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', '.com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', 'com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/')
  })

  it('should remove cookies for each domain part and each path part when path is an uri', () => {
    // given
    const hostname = 'www.myhostname.com'
    const pathname = '/a/path'

    Object.defineProperty(document.location, 'hostname', {
      value: hostname,
      writable: true,
    })
    Object.defineProperty(document.location, 'pathname', {
      value: pathname,
      writable: true,
    })

    // when
    legacyDeleteCookie('foo')

    // then
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', 'www.myhostname.com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/a/', 'www.myhostname.com')

    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', '.myhostname.com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/a/', '.myhostname.com')

    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', 'myhostname.com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/a/', 'myhostname.com')

    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', '.com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/a/', '.com')

    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/', 'com')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/a/', 'com')

    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/')
    expect(deleteCookieAllPathsDomains).toHaveBeenCalledWith('/a/')
  })
})
