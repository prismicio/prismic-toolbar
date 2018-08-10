import { h, render } from 'preact';
import { appendCSS, shadow, div } from 'common';
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

    // Just visiting
    if (!auth && !this.preview.active) return;

    // Create Shadow Container
    const toolbar = shadow('prismic-toolbar-v2', { style: containerStyle });

    // Above Intercom
    appendCSS(document.body, `#intercom-container { z-index: 2147483646 !important }`);

    // Add CSS
    appendCSS(toolbar, shadowStyles);

    // Render
    render(
      <ToolbarComponent
        preview={this.preview}
        prediction={auth ? new Prediction(this.messenger) : null}
      />,
      toolbar
    );
  }
}

const containerStyle = {
  position: 'fixed',
  zIndex: 2147483647,
};
