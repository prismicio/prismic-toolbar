import {
  Messenger, slugify, delay, copyToClipboard,
} from '../common';
import s3 from './s3';

function init(sessionId, sessionType, sessionTitle, ref, csrf) {
  const DOM = {
    $toolbar: $('.toolbar'),
    $openDetailsPanelBtn: $('.toolbar_others-actions .show-details'),
    $closeSessionBtn: $('.toolbar_others-actions .close-session'),
    $openSharePanelBtn: $('.toolbar_share'),
    $closePanelBtn: $('.panel header .close'),
    $mask: $('.mask'),
    $sharePanel: $('.panel-share'),
    $copyBtn: $('.panel-share .share-link_button'),
    $shareableLink: $('.panel-share .share-link_text'),
  };

  function buildImageName(location) {
    return slugify(
      `${location.pathname.slice(1)}${location.hash}$-${sessionId}.png`,
    );
  }

  function csrfy(url) {
    return `${url + (url.indexOf('?') > 0 ? '&' : '?')}_=${csrf}`;
  }

  function createShareableSession(page) {
    const title = sessionType === 'RELEASE' ? sessionTitle : page.document.title;
    const url = csrfy(
      Router.controllers.Previews.share(
        sessionId,
        page.location.href,
        title,
        buildImageName(page.location),
      ).url,
    );
    return $.ajax({
      url,
      type: 'POST',
      xhrFields: { withCredentials: true },
    });
  }

  function displayPanel(name) {
    $(document.body).addClass(`${name}-mode`);
    Messenger.toggle(name);
    setTimeout(() => $(document.body).addClass('fadein'), 100);
  }

  function closePanel() {
    const $body = $(document.body);

    $body.removeClass('fadein');

    delay(250).then(() => {
      $body.removeClass('details-mode').removeClass('share-mode');

      DOM.$shareableLink.text('Unable to retrieve shareable link');

      delay(100).then(() => {
        Messenger.toggle();
        DOM.$sharePanel.addClass('panel--loading');
      });
    });
  }

  // Ping
  setInterval(() => {
    Router.controllers.Previews.ping(sessionId, ref)
      .ajax()
      .then(result => {
        if (result.reload) {
          if (result.ref) {
            Messenger.change(result.ref);
          }
          Messenger.reload();
        } else if (result.close) {
          Messenger.closeSession();
          Messenger.reload();
        }
      });
  }, 3000);

  // Navigating changes
  $('.preview-change > a').each(function() {
    const $change = $(this);
    $change.click(e => {
      e.preventDefault();
      Messenger.reload($change.attr('href'));
    });
  });

  // Close preview session
  DOM.$closeSessionBtn.click(() => {
    Messenger.closeSession();
    Messenger.reload();
  });

  // Share preview session
  DOM.$openSharePanelBtn.click(function() {
    Messenger.on(
      'pong',
      page => {
        const $button = $(this);
        $button.prop('disabled', true);
        createShareableSession(page)
          .then(({ url, hasPreviewImage }) => {
            if (!hasPreviewImage) {
              const canvasOptions = { scale: 2, maxWidth: 450, maxHeight: 230 };
              Messenger.screenshot(canvasOptions, page);
            }
            DOM.$copyBtn.data('link', url);
            DOM.$sharePanel.removeClass('panel--loading');
            DOM.$shareableLink.text(url);
          })
          .then(() => $button.prop('disabled', false))
          .fail(() => Messenger.reload());
      },
      { once: true },
    );

    displayPanel('share');
    Messenger.ping();
  });

  // Copy preview session
  DOM.$copyBtn.click(function() {
    const $button = $(this);
    $button.prop('disabled', true);
    copyToClipboard($button.data('link'));
    DOM.$copyBtn.text('Copied!');
    window.setTimeout(() => {
      DOM.$copyBtn.text('Copy');
      $button.prop('disabled', false);
    }, 1000);
  });

  // Open details
  DOM.$openDetailsPanelBtn.click(() => {
    if (sessionType != 'LIVE') {
      displayPanel('details');
    }
  });

  // Close panel
  DOM.$mask.click(() => closePanel());
  DOM.$closePanelBtn.click(() => closePanel());

  // Upload preview image
  Messenger.on('screenshot', ({ blob, page }) => {
    s3.upload(sessionId, buildImageName(page.location), blob);
  });

  // Display the toolbar
  Messenger.display({
    width: DOM.$toolbar.outerWidth(),
    height: DOM.$toolbar.outerHeight(),
    bottom: 0,
    left: 0,
  });
}

window.Toolbar = {
  init,
};
