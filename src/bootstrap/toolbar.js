import { h, render } from 'preact';
import { div } from 'common';
import { preview as previewCookie } from './cookies';
import { Toolbar as ToolbarComponent } from './components';

// TODO blinking on reload preview????

export class Toolbar {
  constructor({ auth, preview, documents }) {
    if (!auth && !preview) return;

    // TODO shadow or div, (using custom shadowDOM component w/ inline <style scoped />)

    // TODO take screenshot immediately if preview

    render(
      <ToolbarComponent
        auth={auth}
        preview={preview}
        documents={documents}
        closePreview={previewCookie.closePreview}
      />,
      div('prismic-toolbar-v2')
    );
  }
}
