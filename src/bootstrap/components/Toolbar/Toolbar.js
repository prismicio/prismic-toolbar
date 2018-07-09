import { Panel, Menu, views } from '..';
import { h, Component } from 'preact';
import './Toolbar.css';
const { NONE, DOCS, DRAFTS, SHARE } = views;

export class Toolbar extends Component {
  constructor() {
    super(...arguments);
    const { auth, drafts, documents } = this.props;
    this.state = { page: NONE };
  }

  render() {
    const { auth, drafts, documents } = this.props;
    const { page } = this.state;

    return (
      <div className="Toolbar">
        <Panel page={page} drafts={drafts} documents={documents} />
        <Menu
          setPage={page => this.setState({ page })}
          auth={auth}
          preview={Boolean(drafts.length)}
        />
      </div>
    );
  }
}
