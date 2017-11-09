import coookies from './coookies';

// Remember some styles so we can easily restore them back after toggle
let toolbarStyle;
let bodyStyle;
let htmlStyle;

// Display the toolbar (invisible at first)
function display(iframe, dimension) {
  iframe.style.width = `${dimension.width}px`;
  iframe.style.height = `${dimension.height}px`;
  iframe.style.opacity = 1;

  toolbarStyle = iframe.getAttribute('style');
  bodyStyle = document.body.style;
  htmlStyle = document.documentElement.style;
}

// Close the preview session (ie. discard the cookie)
function closeSession() {
  const domainParts = document.location.hostname.split('.');
  const pathParts = document.location.pathname.split('/');

  let domain; let path;
  let sizeWithoutLastPathPart;
  domainParts.forEach((domainPart, domainPartIndex) => {
    domain = domainParts.slice(domainPartIndex).join('.');
    pathParts.forEach((pathPart, pathPartIndex) => {
      sizeWithoutLastPathPart = pathParts.length - 1;
      path = pathParts.slice(pathPartIndex, sizeWithoutLastPathPart).join('/');
      coookies.removeItem(coookies.PREVIEW_COOKIE_KEY, `${path}/`, domain);
      coookies.removeItem(coookies.PREVIEW_COOKIE_KEY, `${path}/`, '.' + domain);
    });
  });
}

// Toggle betweem bar mode and details mode
function toggle(iframe, mode) {
  if (mode === 'detail') {
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

function setup() {
  try {
    // Search for the preview token cookie
    const previewToken = coookies.getPreviewToken();

    if (!previewToken) return;

    const existingToolbar = document.querySelector('#io-prismic-toolbar');
    if (existingToolbar) existingToolbar.remove();

    // Insert the preview bar
    const iframe = (() => {
      const ifr = document.createElement('iframe');

      ifr.setAttribute('id', 'io-prismic-toolbar');
      ifr.setAttribute('src', previewToken);

      ifr.style.position = 'fixed';
      ifr.style.bottom = '10px';
      ifr.style.right = '20px';
      ifr.style.height = '50px';
      ifr.style.width = '100%';
      ifr.style.border = 'none';
      ifr.style['z-index'] = 2147483000;
      ifr.style.opacity = 0;

      document.body.appendChild(ifr);

      return ifr;
    })();

    // Listen to prismic.io messages
    window.addEventListener('message', (e) => {
      const message = e.data;
      switch (message.type) {
        case 'io.prismic.init':
          console.log('init', message.data);

        case 'io.prismic.display':
          display(iframe, message.data);
          break;

        case 'io.prismic.closeSession':
          closeSession();
          break;

        case 'io.prismic.reload':
          reload(message.data);
          break;

        case 'io.prismic.toggle':
          toggle(iframe, message.data);
          break;

        default:
          break;
      }
    });
  } catch (e) {
    // TODO ignore error or let user handle it
  }
}

export default {
  setup,
};
