// import html2canvas from 'html2canvas'; // TODO server side screenshot
// console.log('stylezz', style);
// import { h, render } from 'preact';
// import { div } from 'common';

// export class Toolbar {
//   constructor() {
//     this.clean();
//   }
//
//   clean() {
//     document
//       .querySelectorAll('.wio-link, [data-wio-id], #io-prismic-toolbar')
//       .forEach(el => el.remove());
//   }
// }

// TODO messages??

/*
function setup() {
  const previewToken = Preview.get();

  if (previewToken) {

    // Insert the preview bar
    const iframe = (() => {
      return ifr;
    })();

    // Listen to prismic.io messages
    window.addEventListener('message', e => {
      const message = e.data;
      switch (message.type) {
        case 'io.prismic.ping':
          iframe.contentWindow.postMessage(
            {
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
            },
            '*',
          );
          break;

        case 'io.prismic.display':
          display(iframe, message.data);
          break;

        case 'io.prismic.closeSession':
          Preview.close(); // had Share.close too
          window.location.reload();
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
            resizeCanvas(
              canvas,
              canvasOptions.maxWidth,
              canvasOptions.maxHeight,
            ).toBlob(blob => {
              iframe.contentWindow.postMessage(
                {
                  type: 'io.prismic.screenshot',
                  data: { blob, page },
                },
                '*',
              );
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
          window.location.reload();
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
*/
