import Preview from './preview';

export default {

  // Setup shared preview (ie. get ref cookie from session and reload)
  setup(config, SESSION) {

    const validSession = SESSION && typeof SESSION === 'string' && SESSION.length === 16
    const handledSession = sessionStorage.getItem('prismicPreview')
    const error = message => console.error(`[prismic.io] Unable to access to preview session: ${message}`);

    if (!validSession || handledSession) return Promise.resolve();

    displayLoading(config, _ => { // Show prismic loader

      // Get ref from session
      fetch(`${config.baseURL}/previews/token/${SESSION}`).then(response => {
        response.json().then(json => {

          if (json.ref) { // If current ref for session
            Preview.close(); // Clear preview cookie
            Preview.set(json.ref); // Set new preview cookie
            sessionStorage.setItem('prismicPreview', true) // Session was handled
            window.location.reload(); // Reload
          }

          else error('Invalid session');

        }).catch(_ => error('Invalid server response'));

      }).catch(_ => error('Invalid server response'));

    });

  }

};


// Show prismic loader
function displayLoading(config, callback) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', `${config.baseURL}/previews/loading`);
  iframe.style.position = 'fixed';
  iframe.style.right = 0;
  iframe.style.left = 0;
  iframe.style.top = 0;
  iframe.style.bottom = 0;
  iframe.style['z-index'] = 2147483000;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.opacity = 0;
  iframe.style.transition = '.5s opacity';
  document.body.appendChild(iframe);
  setTimeout(_ => {
    iframe.style.opacity = 1;
    setTimeout(_ => callback(), 1800);
  }, 200);
}
