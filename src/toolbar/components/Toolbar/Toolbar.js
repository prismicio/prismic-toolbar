import { Panel, Menu, PreviewMenu, views } from '..';
import { Component } from 'preact';

const { NONE } = views;

export class Toolbar extends Component {
  constructor({ prediction }) {
    super(...arguments);

    this.closePreview = this.closePreview.bind(this);

    this.state = {
      page: NONE,
      documents: prediction ? prediction.documents : [],
      renderedPreview: this.props.preview.active
    };
    if (prediction) prediction.onDocuments(documents => this.setState({ documents }));
  }

  setPage = page => this.setState({ page });

  closePreview() {
    this.setState({ renderedPreview: false });
  }

  render() {
    const { preview, analytics, auth } = this.props;
    const { page, documents } = this.state;
    const hasDocs = Boolean(documents.length);

    return (
      <div className="Toolbar">
        <Panel
          onDocumentClick={analytics && analytics.trackDocumentClick}
          closePanel={() => this.setPage(NONE)}
          documents={documents}
          preview={preview}
          page={page}
        />
        <Menu setPage={this.setPage} page={page} in={hasDocs} />
        { this.props.displayPreview && this.state.renderedPreview
          ? <PreviewMenu
            auth={auth}
            closePreview={this.closePreview}
            setPage={this.setPage}
            preview={preview}
            in={preview.active} />
          : null
        }
      </div>
    );
  }
}
