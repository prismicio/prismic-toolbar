let html2canvasPromise;

const screenshot = async () => {
  document.getElementById('prismic-toolbar-v2').setAttribute('data-html2canvas-ignore', true);
  if (!html2canvasPromise) html2canvasPromise = script('https://html2canvas.hertzen.com/dist/html2canvas.min.js');
  await html2canvasPromise;

  const canvas = await window.html2canvas(document.body, {
    logging: false,
    width: '100%',
    height: window.innerHeight,
  });
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.6));
};

function script(src) {
  return new Promise(resolve => {
    const el = document.createElement('script');
    el.src = src;
    document.head.appendChild(el);
    el.addEventListener('load', () => resolve(el));
  });
}

export default screenshot;
