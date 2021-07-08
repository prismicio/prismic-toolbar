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
  previewUpdate: 'previewUpdate',
  previewEnd: 'previewEnd'
};

export const hasWindowMiddleware = name => typeof window === 'object'
  && typeof window.prismic === 'object'
  && typeof window.prismic.middleware === 'object'
  && typeof window.prismic.middleware[windowMiddleware[name]] === 'function';

export const getWindowMiddleware = name => window.prismic.middleware[windowMiddleware[name]];

// Redirect middleware
export const redirectMiddleware = {
  previewUpdate: 'redirectUrlOnUpdate',
  previewEnd: 'redirectUrlOnEnd'
};

const scriptQuery = 'script[src*="static.cdn.prismic.io/prismic."]';

export const hasRedirectMiddleware = name => {
  if (typeof window !== 'object' || typeof document !== 'object') {
    return false;
  }

  // Matches first Prismic toolbar script
  const scriptTag = document.querySelector(scriptQuery);

  if (!scriptTag) {
    return false;
  }

  return !!scriptTag.dataset[redirectMiddleware[name]];
};

export const getRedirectMiddleware = name => next => {
  try {
    window.location.replace(document.querySelector(scriptQuery).dataset[redirectMiddleware[name]]);
  } catch (error) {
    next();
  }
};

// Middleware factory
export const createMiddleware = name => {
  const newMiddleware = new Middleware();

  // Register window middleware if available
  if (hasWindowMiddleware(name)) {
    newMiddleware.use(getWindowMiddleware(name));
  }

  // Register redirect middleware if available
  if (hasRedirectMiddleware(name)) {
    newMiddleware.use(getRedirectMiddleware(name));
  }

  return newMiddleware;
};
