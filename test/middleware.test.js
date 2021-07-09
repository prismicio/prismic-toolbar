import { Middleware } from '../src/common/middleware';

const dummyMiddleware = {
  flat: next => next(),
  async: async next => {
    await new Promise(res => setTimeout(res, 200));
    return next();
  }
};

describe('common: middleware class', () => {
  let middleware;

  beforeAll(() => {
    jest.spyOn(dummyMiddleware, 'flat');
    jest.spyOn(dummyMiddleware, 'async');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new Middleware();
  });

  it('runs middleware', async () => {
    middleware.use(dummyMiddleware.flat);
    middleware.use(dummyMiddleware.flat);
    await middleware.run();

    expect(dummyMiddleware.flat).toHaveBeenCalledTimes(2);
  });

  it('runs async middleware', async () => {
    middleware.use(dummyMiddleware.flat);
    middleware.use(dummyMiddleware.async);
    middleware.use(dummyMiddleware.async);
    await middleware.run();

    expect(dummyMiddleware.async).toHaveBeenCalledTimes(2);
    expect(dummyMiddleware.flat).toHaveBeenCalledTimes(1);
  });

  it('chains middleware', async () => {
    middleware.use(dummyMiddleware.flat).use(dummyMiddleware.flat);
    await middleware.run();

    expect(dummyMiddleware.flat).toHaveBeenCalledTimes(2);
  });


  it('ignores non-function middleware', async () => {
    middleware.use(undefined);
    middleware.use(dummyMiddleware.flat);
    await middleware.run();

    expect(dummyMiddleware.flat).toHaveBeenCalled();
  });

  it('exits when `next` is not called', async () => {
    middleware.use(dummyMiddleware.async);
    middleware.use(() => {});
    middleware.use(dummyMiddleware.async);
    middleware.use(dummyMiddleware.flat);
    await middleware.run();

    expect(dummyMiddleware.async).toHaveBeenCalledTimes(1);
    expect(dummyMiddleware.flat).not.toHaveBeenCalled();
  });

  it('runs final provided callback', async () => {
    const mockCallback = jest.fn();

    middleware.use(dummyMiddleware.flat);
    await middleware.run(mockCallback);

    expect(mockCallback).toHaveBeenCalled();
  });
});
