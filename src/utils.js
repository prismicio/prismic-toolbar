export default {

  debounce(func, wait, immediate) {
    let timeout;
    return (...args) => {
      const context = this;

      const later = () => {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  },

  iFrame(src) {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    document.head.appendChild(iframe);
    return iframe;
  },

  script(src) {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      document.head.appendChild(s);
      s.addEventListener('load', resolve);
      s.src = src;
    });
  },

};
