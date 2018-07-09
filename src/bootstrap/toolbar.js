import { h, render } from 'preact';
import { Toolbar as ToolbarComponent } from './components';
import { div } from 'common';

export class Toolbar {
  constructor({ auth, preview, documents }) {
    if (!auth || !preview) return;

    // TODO shadow or div

    render(
      <ToolbarComponent auth={auth} drafts={preview} documents={documents} />,
      div('prismic-toolbar-v2')
    );
  }
}
