import { render } from 'preact';
import { appendCSS, shadow, readyDOM } from '@common';
import { Toolbar as ToolbarComponent } from './components';
import shadowStyles from './index.css';

class Toolbar {
  constructor({ displayPreview, auth, preview, prediction, analytics }) {
    this.preview = preview;
    this.auth = auth;
    this.prediction = prediction;
    this.analytics = analytics;
    this.displayPreview = displayPreview;
    this.setup();
  }

  async setup() {
    // Because we need the DOM now
    await readyDOM();

    // Create toolbar in a shadow DOM
    const toolbar = shadow({
      id: 'prismic-toolbar-v2',
      style: { position: 'fixed', zIndex: 2147483647 },
    });

    // Put above Intercom
    appendCSS(document.body, '#intercom-container { z-index: 2147483646 !important }');

    // Styles
    appendCSS(toolbar, shadowStyles);

    // Render the React app
    render(
      <ToolbarComponent
        auth={this.auth}
        displayPreview={this.displayPreview}
        preview={this.preview}
        prediction={this.prediction}
        analytics={this.analytics}
      />,
      toolbar
    );
  }
}

window.PrismicToolbarApp = Toolbar;
