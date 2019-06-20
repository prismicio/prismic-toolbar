export function eventToPromise(
  /* HTMLElement */element,
  /* string */eventName,
  /* (event) => T */resolver
) /* Promise<T> */ {
  return new Promise(resolve => {
    element.addEventListener(eventName, event => {
      const toResolve = resolver(event);
      resolve(toResolve);
    }, { once: true });
  });
}
