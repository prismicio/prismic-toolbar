const screenshot = async () => {
  document.getElementById('prismic-toolbar-v2').setAttribute('data-html2canvas-ignore', true);

  const options = { logging: false, width: '100%', height: window.innerHeight };
  
  return import('https://html2canvas.hertzen.com/dist/html2canvas.esm.js')
  .then(html2canvas => html2canvas(document.body, options))
  .then(canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.6)));
}

export default screenshot;
