export default class Messenger {

  constructor(url) {
    this.iframe = iFrame(url)
    this.mailbox = []
    window.addEventListener('message', msg => {
      if (this.iframe.contentWindow !== msg.source) return
      const { data } = msg
      this.mailbox.push(data)
      const event = new Event('mail')
      event.detail = data
      this.iframe.dispatchEvent(event)
    })
  }

  // Send message
  send(type, data=null) {
    this.iframe.contentWindow.postMessage({ type, data }, '*')
  }

  // Listen for message
  onMail(type, callback, once=false) {
    const { iframe } = this
    iframe.addEventListener('mail', _cbk)
    function _cbk(e) {
      const data = e.detail
      if (data.type !== type) return
      callback(data.data)
      if (once) iframe.removeEventListener('mail', _cbk)
    }
  }

  // Wait for message
  getNew(type) {
    return new Promise(resolve => this.onMail(type, mail => resolve(mail), true))
  }

  // Check mailbox
  getOld(type) {
    const mail = this.mailbox.filter(msg => msg.type === type)
    const message = mail[mail.length-1]
    return message ? message.data : null
  }

  // Check mailbox or wait
  async get(type) {
    const mail = this.getOld(type)
    if (mail) return mail
    return await this.getNew(type)
  }

}


// Hidden iFrame
function iFrame(src) {
  const iframe = document.createElement('iframe')
  iframe.src = src
  document.head.appendChild(iframe)
  return iframe
}
