import { h, render } from 'preact';
import { appendCSS, shadow } from 'common';
import { Toolbar as ToolbarComponent } from './components';
import { Prediction } from './prediction';
import shadowStyles from './index.css';

// TODO blinking on reload preview????

export class Toolbar {
  constructor({ messenger, preview }) {
    this.messenger = messenger;
    this.preview = preview;
    this.setup();
  }

  async setup() {
    const auth = await this.messenger.post('auth');

    // Hide for normal visitors
    if (!auth && !this.preview.active) return;

    // Create toolbar in a shadow DOM
    const toolbar = shadow({
      id: 'prismic-toolbar-v2',
      style: { position: 'fixed', zIndex: 2147483647 },
    });

    // Put above Intercom
    appendCSS(document.body, `#intercom-container { z-index: 2147483646 !important }`);

    // Styles
    appendCSS(toolbar, shadowStyles);

    // Render the React app
    render(
      <ToolbarComponent
        preview={this.preview}
        prediction={auth ? new Prediction(this.messenger, this.messenger.hostname) : null}
      />,
      toolbar
    );
  }
}