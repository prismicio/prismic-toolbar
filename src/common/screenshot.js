import html2canvas from 'html2canvas';

export const screenshot = async () => {
  const canvas = await html2canvas(document.body);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.5));
};
