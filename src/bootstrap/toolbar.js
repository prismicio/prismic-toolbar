import { h, render } from 'preact';
import { div } from 'common';
import { preview as previewCookie } from './cookies';
import { Toolbar as ToolbarComponent } from './components';
import { Prediction } from './prediction';
import { Preview } from './preview';

// TODO blinking on reload preview????

export class Toolbar {
  constructor({ messenger, preview }) {
    this.messenger = messenger;
    this.setup();
  }

  async setup() {
    const auth = await this.messenger.post('auth');

    if (!auth && !preview.active) return;

    // TODO shadow or div, (using custom shadowDOM component w/ inline <style/>)
    render(
      <ToolbarComponent
        preview={preview}
        prediction={auth ? new Prediction(this.messenger) : null}
      />,
      div('prismic-toolbar-v2')
    );
  }
}
