import { h, Component } from 'preact';
import './Menu.css';

const { NONE, DOCS, DRAFTS, SHARE } = views;

export class Menu extends Component {
  render() {
    const { setPage, auth, preview } = this.props;
    // Preview & not
    return <div className="Menu">menu</div>;
  }
}
