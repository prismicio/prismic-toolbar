import { h, render } from 'preact';
import { appendCSS, shadow } from 'common';
import { Toolbar as ToolbarComponent } from './components';
import { Prediction } from './prediction';
import styles from './index.css';

// BUG blinking on reload preview????

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
    const toolbar = shadow('prismic-toolbar-v2');

    // Add CSS
    appendCSS(toolbar, styles);

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
