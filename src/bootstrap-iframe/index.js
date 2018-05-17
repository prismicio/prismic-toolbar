window.addEventListener('message', e => {
  if (e.data.type === 'close') document.cookie="io.prismic.previewSession=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  else window.parent.postMessage({ type: e.data.type }, "*");
});

window.parent.postMessage({ type: 'ready' }, "*");
