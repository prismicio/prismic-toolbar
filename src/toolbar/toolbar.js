import { h, render } from 'preact';
import { div } from 'common';
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
    const auth = await this.messenger.post('auth');

    if (!auth && !this.preview.active) return;

    // TODO shadow or div, (using custom shadowDOM component w/ inline <style/>)
    render(
      <ToolbarComponent
        preview={this.preview}
        prediction={auth ? new Prediction(this.messenger) : null}
      />,
      div('prismic-toolbar-v2')
    );
  }
}
