export default {

  throttle(func, wait, options) {
    let timeout; let context; let args; let result; let previous = 0;
    if (!options) options = {};

    function later() {
      previous = options.leading === false ? 0 : Date.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) {
        context = null;
        args = null;
      }
    }

    function throttled(...throttledArgs) {
      const now = Date.now();
      if (!previous && options.leading === false) previous = now;
      const remaining = wait - (now - previous);
      context = this;
      args = throttledArgs;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) {
          context = null;
          args = null;
        }
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    }

    throttled.cancel = () => {
      clearTimeout(timeout);
      previous = 0;
      timeout = null;
      args = null;
      context = null;
    };

    return throttled;
  },
};
