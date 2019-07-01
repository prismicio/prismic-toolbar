import { Component } from 'preact';
import { Panel, Menu, PreviewMenu, views } from '..';

const { NONE } = views;

export class Toolbar extends Component {
  constructor({ prediction }) {
    super(...arguments);
    this.closePreview = this.closePreview.bind(this);

    if (prediction) {
      prediction.onDocuments((documents, queries) => {
        this.setState({ documents, queries, documentsLoading: false });
      });

      prediction.onDocumentsLoading(() => {
        this.setState({ documentsLoading: true });
      });

      prediction.setup();
    }

    this.state = {
      page: NONE,
      documents: [],
      queries: [],
      renderedPreview: this.props.preview.active,
      documentsLoading: false
    };
  }

  setPage = page => this.setState({ page });

  closePreview() {
    this.setState({ renderedPreview: false });
  }

  render() {
    const { preview, analytics, auth } = this.props;
    const { page, documents, queries } = this.state;
    const hasDocs = Boolean(documents && documents.length);

    return (
      <div className="Toolbar">
        <Panel
          onDocumentClick={analytics && analytics.trackDocumentClick}
          closePanel={() => this.setPage(NONE)}
          documentsLoading={this.state.documentsLoading}
          documents={documents}
          queries={queries}
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
