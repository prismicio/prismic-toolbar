import { h, render } from 'preact';
import html2canvas from 'html2canvas';
import { div, Publisher, appendCSS, shadow } from 'common';
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
    const auth = this.messenger.post('auth');

    // Just visiting
    if (!(await auth) && !this.preview.active) return;

    // Page screenshot
    new Publisher({
      async screenshot() {
        const canvas = await html2canvas(document.body);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.5));
      },
    });

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
