import html2canvas from 'html2canvas';

export const screenshot = async _ => {
  document.getElementById('prismic-toolbar-v2').setAttribute('data-html2canvas-ignore', true);

  const canvas = await html2canvas(document.body, {
    logging: false,
    width: '100%',
    height: window.innerHeight,
  });

  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.6));
};
