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

export const middleware = {
  previewUpdate: 'previewUpdate',
  previewEnd: 'previewEnd'
};

// Window middleware
export const windowMiddleware = {
  previewUpdate: 'onPreviewUpdate',
  previewEnd: 'onPreviewEnd'
};

export const hasWindowMiddleware = name => typeof window === 'object'
  && typeof window.prismic === 'object'
  && typeof window.prismic.toolbar === 'object'
  && typeof window.prismic.toolbar[windowMiddleware[name]] === 'function';

export const getWindowMiddleware = name => window.prismic.toolbar[windowMiddleware[name]];

// Middleware factory
export const createMiddleware = name => {
  const newMiddleware = new Middleware();

  // Register window middleware if available
  if (hasWindowMiddleware(name)) {
    newMiddleware.use(getWindowMiddleware(name));
  }

  return newMiddleware;
};
