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

export function iFrame(src) {
  return new Promise(resolve => {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.onload = _ => resolve(iframe);
    document.head.appendChild(iframe);
    return iframe;
  });
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
