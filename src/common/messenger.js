import { random } from 'common';

export class Messenger {
  constructor(recipient) {
    if (typeof recipient === 'string') this.recipient = iframe(recipient);
    else this.recipient = Promise.resolve(recipient);

    this.target = new EventTarget();
    this.channel = new MessageChannel();

    this.channel.port1.onmessage = msg => {
      const { type, data } = msg.data;
      const event = new Event(type);
      event.detail = data;
      this.target.dispatchEvent(event);
    };
  }

  async post(_type, data) {
    const type = _type + random(8);
    const recipient = await this.recipient;

    return new Promise(resolve => {
      this.target.addEventListener(type, e => resolve(e.detail), { once: true });
      recipient.postMessage({ type, data }, '*');
    });
  }
}

async function iframe(src) {
  return new Promise(resolve => {
    let node = document.createElement('iframe');
    node.onload = () => resolve(node.contentWindow);
    node.src = src;
    document.head.appendChild(node);
  });
}
