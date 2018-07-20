import { h, render } from 'preact';
import html2canvas from 'html2canvas';
import { div, Publisher } from 'common';
import { Toolbar as ToolbarComponent } from './components';
import { Prediction } from './prediction';

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

    // Render Toolbar TODO shadowDiv, (custom shadowDOM component w/ inline <style/>)
    render(
      <ToolbarComponent
        preview={this.preview}
        prediction={auth ? new Prediction(this.messenger) : null}
      />,
      div('prismic-toolbar-v2')
    );
  }
}
