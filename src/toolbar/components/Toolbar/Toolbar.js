import { Panel, Menu, PreviewMenu, views } from '..';
import { h, Component } from 'preact';

const { NONE } = views;

export class Toolbar extends Component {
  constructor() {
    super(...arguments);
    this.state = { page: NONE, documents: [] };

    const { prediction } = this.props;
    if (prediction) prediction.onDocuments(documents => this.setState({ documents }));
  }

  setPage = page => this.setState({ page });

  render() {
    const { preview } = this.props;
    const { page, documents } = this.state;
    const hasDocs = Boolean(documents.length);

    return (
      <div className="Toolbar">
        <Panel
          closePanel={() => this.setPage(NONE)}
          documents={documents}
          preview={preview}
          page={page}
        />
        {hasDocs && <Menu setPage={this.setPage} page={page} />}
        {preview.active && <PreviewMenu setPage={this.setPage} preview={preview} />}
      </div>
    );
  }
}
