import { Panel, Menu, views } from '..';
import { h, Component } from 'preact';
import './Toolbar.css';

const { NONE } = views;

export class Toolbar extends Component {
  constructor() {
    super(...arguments);
    this.state = { page: NONE };
  }

  setPage = page => this.setState({ page });

  render() {
    const { preview, prediction } = this.props;
    const { page } = this.state;

    return (
      <div className="Toolbar">
        <Panel
          setPage={this.setPage}
          prediction={prediction}
          preview={preview}
          page={page}
        />
        <Menu setPage={this.setPage} preview={preview} />
      </div>
    );
  }
}