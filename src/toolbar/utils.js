export const reloadOrigin = () => window.location.reload();

// Publication live preview refs: master overlay + draft (`m-…:p-…`).
export const isCompositePreviewRef = ref =>
  typeof ref === 'string' && /^m-[^:]+:p-.+$/.test(ref);

let a;
export const getAbsoluteURL = url => {
  if (!a) a = document.createElement('a');
  a.href = url;
  return a.href;
};
