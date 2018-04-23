import html2canvas from 'html2canvas'; // TODO dom-to-image and dynamic load
import Preview from './preview';

// Remember some styles so we can easily restore them back after toggle
let toolbarStyle;
let bodyStyle;
let htmlStyle;

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

// Toggle betweem bar mode and details mode
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

// Reload the browser window (either on the same URL or on the given one)
function reload(url) {
  if (url) {
    document.location = url;
  } else {
    document.location.reload();
  }
}

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

function setup() {
  const previewToken = Preview.get();

  if (previewToken) {
    const existingToolbar = document.querySelector('#io-prismic-toolbar');
    if (existingToolbar) existingToolbar.remove();

    // Insert the preview bar
    const iframe = (() => {
      const ifr = document.createElement('iframe');

      ifr.setAttribute('id', 'io-prismic-toolbar');
      ifr.setAttribute('src', previewToken);

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
    })();

    // Listen to prismic.io messages
    window.addEventListener('message', e => {
      const message = e.data;
      switch (message.type) {
        case 'io.prismic.ping':
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
          break;

        case 'io.prismic.display':
          display(iframe, message.data);
          break;

        case 'io.prismic.closeSession':
          Preview.close();
          break;

        case 'io.prismic.screenshot': {
          const { canvasOptions, page } = message.data;
          const html2canvasOptions = {
            height: window.outerHeight,
            width: window.outerWidth,
            scale: canvasOptions.scale,
            ignoreElements: element => element.classList.contains('wio-link'),
          };

          html2canvas(document.body, html2canvasOptions).then(canvas => {
            resizeCanvas(canvas, canvasOptions.maxWidth, canvasOptions.maxHeight).toBlob(blob => {
              iframe.contentWindow.postMessage({
                type: 'io.prismic.screenshot',
                data: { blob, page },
              }, '*');
            });
          });
          break;
        }

        case 'io.prismic.reload':
          reload(message.data);
          break;

        case 'io.prismic.change':
          Preview.close();
          Preview.set(message.data.ref);
          break;

        case 'io.prismic.toggle':
          toggle(iframe, message.data);
          break;

        default:
          break;
      }
    });
  }
}

export default {
  setup,
};
