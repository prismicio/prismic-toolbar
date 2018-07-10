import { Panel, Menu, views } from '..';
import { h, Component } from 'preact';
import './Toolbar.css';

const { NONE } = views;

export class Toolbar extends Component {
  constructor() {
    super(...arguments);
    this.state = { page: NONE };
  }

  render() {
    const { auth, preview, documents, closePreview } = this.props;
    const { page } = this.state;

    return (
      <div className="Toolbar">
        <Panel
          setPage={p => this.setState({ page: p })}
          page={page}
          documents={documents}
          drafts={preview ? preview.drafts : []}
        />
        <Menu
          setPage={p => this.setState({ page: p })}
          closePreview={closePreview}
          preview={preview}
          auth={auth}
        />
      </div>
    );
  }
}
