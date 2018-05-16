export function debounce(func, wait, immediate) {
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
}

export function readyDOM() {
  return new Promise(resolve => {
    if (document.readyState !== 'loading') resolve();
    else {
      document.addEventListener('readystatechange', () => {
        if (document.readyState !== 'loading') resolve();
      });
    }
  });
}
