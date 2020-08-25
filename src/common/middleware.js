export class Middleware {
  use(fn) {
    if (typeof fn === 'function') {
      this.run = (stack =>
        (next = () => {}) => stack(fn.bind(this, next.bind(this)))
      )(this.run);
    }
    return this;
  }

  run = (next = () => {}) => next();
}
