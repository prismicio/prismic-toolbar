import { Component } from 'react';
import { Panel, Menu, PreviewMenu, views } from '..';

const { NONE } = views;

export class Toolbar extends Component {
  constructor({ predictionByRepo, analyticsByRepo, previews }) {
    super(...arguments);

    Object.keys(predictionByRepo).forEach(repo => {
      const prediction = predictionByRepo[repo];
      if (prediction) {
        prediction.onDocuments((documents, queries) => {
          const newDocs = { [repo]: this.bindDocumentActions(repo, documents, analyticsByRepo) };
          this.setState({
            documentsByRepo: Object.assign(
              {},
              this.state.documentsByRepo, newDocs
            ),
            queries,
            documentsLoading: false
          });
        });

        prediction.onDocumentsLoading(() => {
          this.setState({ documentsLoading: true });
        });

        prediction.setup();
      }
    });
    this.state = {
      page: NONE,
      documentsByRepo: {},
      queries: [],
      renderedPreviews: previews.active,
      documentsLoading: false
    };
  }

  setPage = page => this.setState({ page });

  closePreview = () => {
    this.setState({ renderedPreviews: false });
  }

  bindDocumentActions(repo, documents, analyticsByRepo) {
    return documents.map(d => {
      const onClick = analyticsByRepo[repo] && analyticsByRepo[repo].trackDocumentClick;
      if (onClick) {
        d.onClick = onClick;
      }
      return d;
    });
  }

  render() {
    const { previews } = this.props;

    const { page, documentsByRepo, queries } = this.state;
    const allDocuments = Object.keys(documentsByRepo)
      .map(repo => documentsByRepo[repo])
      .reduce((acc, docs) => acc.concat(docs), []);
    const hasDocs = Boolean(allDocuments && allDocuments.length);

    return (
      <div className="Toolbar">
        <Panel
          closePanel={() => this.setPage(NONE)}
          documentsLoading={this.state.documentsLoading}
          documents={allDocuments}
          queries={queries}
          previews={previews}
          page={page}
        />
        <Menu setPage={this.setPage} page={page} in={hasDocs} />
        { this.props.previews.display && this.state.renderedPreviews
          ? <PreviewMenu
            auth={previews.auth}
            closePreview={this.closePreview}
            setPage={this.setPage}
            previews={previews}
            in={this.state.renderedPreviews} />
          : null
        }
      </div>
    );
  }
}
