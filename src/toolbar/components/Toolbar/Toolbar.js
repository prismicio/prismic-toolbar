import { Panel, Menu, PreviewMenu, views } from '..';
import { Component } from 'preact';

const { NONE } = views;

export class Toolbar extends Component {
  constructor({ prediction }) {
    super(...arguments);
    this.state = { page: NONE, documents: prediction.documents, queries: prediction.queries };
    prediction.onDocuments(documents => this.setState({ documents }));
  }

  setPage = page => this.setState({ page });

  render() {
    const { preview, analytics } = this.props;
    const { page, documents, queries } = this.state;
    const hasDocs = Boolean(documents.length);

    return (
      <div className="Toolbar">
        <Panel
          onDocumentClick={analytics.trackDocumentClick}
          closePanel={_ => this.setPage(NONE)}
          documents={documents}
          preview={preview}
          page={page}
        />
        <Menu setPage={this.setPage} page={page} in={hasDocs} />
        <PreviewMenu setPage={this.setPage} preview={preview} in={preview.active} />
      </div>
    );
  }
}
