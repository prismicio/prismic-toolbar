import html2canvas from 'html2canvas';
import { preview } from './cookies';
import { onPrismic, reload } from './utils';

export default {

  setup() {

    const previewRef = preview.get()

    if (!previewRef) return

    legacyToolbar()
    
    const toolbar = createToolbar(previewRef)

    // Listen to prismic.io messages
    onPrismic('ping', _ => pong(toolbar))
    onPrismic('display', data => display(toolbar, data))
    onPrismic('closeSession', preview.end)
    onPrismic('screenshot', data => screenshot(toolbar, data))
    onPrismic('reload', reload)
    onPrismic('toggle', data => toggle(toolbar, data))
    onPrismic('change', data => preview.start(data.ref))

  }

}


// Legacy
function legacyToolbar() {
  const legacy = document.querySelector('#io-prismic-toolbar')
  if (legacy) legacy.remove()
}


// Remember some styles so we can easily restore them back after toggle
let toolbarStyle;
let bodyStyle;
let htmlStyle;

// Create the toolbar
function createToolbar(token) {
  const ifr = document.createElement('iframe');

  ifr.setAttribute('id', 'io-prismic-toolbar');
  ifr.setAttribute('src', token);

  ifr.style.position = 'fixed';
  ifr.style.bottom = '0';
  ifr.style.left = '0';
  ifr.style.height = '70px';
  ifr.style.width = '100%';
  ifr.style.border = 'none';
  ifr.style['z-index'] = 2147483000;
  ifr.style.opacity = 0;

  document.body.appendChild(ifr);

  return ifr;
}

// Display the toolbar (invisible at first)
function display(iframe, dimension) {
  iframe.style.width = `${dimension.width}px`;
  iframe.style.height = `${dimension.height}px`;
  iframe.style.bottom = dimension.hasOwnProperty('bottom') ? `${dimension.bottom}px` : '';
  iframe.style.top = dimension.hasOwnProperty('top') ? `${dimension.top}px` : '';
  iframe.style.right = dimension.hasOwnProperty('right') ? `${dimension.right}px` : '';
  iframe.style.left = dimension.hasOwnProperty('left') ? `${dimension.left}px` : '';
  iframe.style.opacity = 1;

  const needLegacyPosition = ['bottom', 'top', 'right', 'left'].every(prop => !dimension.hasOwnProperty(prop));
  if (needLegacyPosition) {
    iframe.style.top = '';
    iframe.style.bottom = '10px';
    iframe.style.left = '';
    iframe.style.right = '20px';
  }

  toolbarStyle = iframe.getAttribute('style');
  bodyStyle = document.body.style;
  htmlStyle = document.documentElement.style;
}

// Toggle toolbar mode
function toggle(iframe, mode) {
  if (mode === 'detail' /* deprecated */ || mode === 'details' || mode === 'share') {
    iframe.style.top = 0;
    iframe.style.left = 0;
    iframe.style.right = 0;
    iframe.style.bottom = 0;
    iframe.style.width = '100%';
    iframe.style.height = '100%';

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  } else {
    iframe.setAttribute('style', toolbarStyle);
    document.body.style = bodyStyle;
    document.documentElement.style = htmlStyle;
  }
}

// ???
function pong(iframe) {
  iframe.contentWindow.postMessage({
    type: 'io.prismic.pong',
    data: {
      location: {
        href: window.location.href,
        hash: window.location.hash,
        pathname: window.location.pathname,
      },
      document: {
        title: document.title,
      },
    },
  }, '*');
}

// Screenshot for prismic.link
function screenshot(iframe, data) {
  const { canvasOptions, page } = data;

  html2canvas(document.body, {
    height: window.outerHeight,
    width: window.outerWidth,
    scale: canvasOptions.scale,
    ignoreElements: element => element.classList.contains('wio-link'),
  })
  .then(canvas => {
    resizeCanvas(canvas, canvasOptions.maxWidth, canvasOptions.maxHeight).toBlob(blob => {
      iframe.contentWindow.postMessage({
        type: 'io.prismic.screenshot',
        data: { blob, page },
      }, '*');
    });
  });
}

// Resize canvas
function resizeCanvas(canvas, maxWidth, maxHeight) {
  let width;
  let height;

  if (canvas.width >= canvas.height && canvas.width > maxWidth) {
    width = maxWidth;
    height = Math.round((maxWidth * canvas.height) / canvas.width);
  } else {
    height = maxHeight;
    width = Math.round((maxHeight * canvas.width) / canvas.height);
  }

  const canvasResized = document.createElement('canvas');
  const ctxResized = canvasResized.getContext('2d');
  canvasResized.width = width;
  canvasResized.height = height;

  ctxResized.drawImage(canvas, 0, 0, width, height);
  return canvasResized;
}
