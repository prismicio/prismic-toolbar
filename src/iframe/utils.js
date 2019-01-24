export const delay = function(ms) {
  return new Promise(rs => {
    setTimeout(_ => rs(), ms)
  })
};

export const slugify = function(str, whitespaceChar = '-', predicat = () => { return false}) {
  const withSuffix = (s, index = 0) => {
    if (index >= 10) {
      throw new Error('Unable to append suffix to slug');
    } else {
      const x = s + (index === 0 ? '' : index);
      return predicat(x) ? withSuffix(s, index + 1) : x;
    }
  };

  const slugified = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                                  .replace(/[^-_.\w]/g, whitespaceChar)
                                  .toLowerCase();
  return withSuffix(slugified);
}

export const copyToClipboard = function(text) {
  if (window.clipboardData && window.clipboardData.setData) {
    // IE specific code path to prevent textarea being shown while dialog is visible.
    return window.clipboardData.setData("Text", text);

  } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
    var textarea = document.createElement("textarea");
    textarea.textContent = text;
    textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
    document.body.appendChild(textarea);
    textarea.select();
    try {
      return document.execCommand("copy");  // Security exception may be thrown by some browsers.
    } catch (ex) {
      console.warn("Copy to clipboard failed.", ex);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}