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

  readyDOM() {
    return new Promise(resolve => {
      if (document.readyState === 'complete') resolve();
      else document.addEventListener('DOMContentLoaded', resolve);
    });
  },

};
