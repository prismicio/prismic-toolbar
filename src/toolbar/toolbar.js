import { render } from 'preact';
import { appendCSS, shadow, readyDOM } from '@common';
import { Toolbar as ToolbarComponent } from './components';
import shadowStyles from './index.css';

export class Toolbar {
  constructor({ displayPreview, previews, predictionByRepo, analyticsByRepo }) {
    this.displayPreview = displayPreview;
    this.previews = previews;
    this.predictionByRepo = predictionByRepo;
    this.analyticsByRepo = analyticsByRepo;
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
        displayPreview={this.displayPreview}
        previews={this.previews}
        predictionByRepo={this.predictionByRepo}
        analyticsByRepo={this.analyticsByRepo}
      />,
      toolbar
    );
  }
}

window.prismic.Toolbar = Toolbar;
