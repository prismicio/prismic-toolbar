import { h, Component } from 'preact';
import { views } from '..';
import './Menu.css';

const { DOCS, DRAFTS, SHARE } = views;

export class Menu extends Component {
  render() {
    const { setPage, closePreview, preview } = this.props;

    if (preview)
      return (
        <div className="Menu-Preview">
          <div>
            <div>{preview.title}</div>
            <div className="docs" onClick={_ => setPage(DRAFTS)}>
              {preview.drafts.length} docs
            </div>
            <div className="share" onClick={_ => setPage(SHARE)}>
              Get a shareable link
            </div>
          </div>
          <div onClick={closePreview}>x</div>
        </div>
      );

    return (
      <div className="Menu" onClick={_ => setPage(DOCS)}>
        ✏
      </div>
    );
  }
}
