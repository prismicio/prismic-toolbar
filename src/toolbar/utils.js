export const reloadOrigin = () => window.location.reload();

let a;
export const getAbsoluteURL = url => {
  if (!a) a = document.createElement('a');
  a.href = url;
  return a.href;
};
