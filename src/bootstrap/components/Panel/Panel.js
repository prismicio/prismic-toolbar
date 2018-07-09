import { h, Component } from 'preact';
import './Panel.css';

const { NONE, DOCS, DRAFTS, SHARE } = views;

export class Panel extends Component {
  render() {
    const { page, drafts, documents } = this.props;
    // Preview & Shareable & Sharing Link

    if (page === NONE) return null;

    if (page === DOCS) return <div className="Panel Docs" />;

    if (page === DRAFTS) return <div className="Panel Drafts" />;

    if (page === SHARE) return <div className="Panel Share" />;

    // {
    //   title: preview.title,
    //   documents: [].concat(preview.releasePreview).concat(preview.draftPreview).filter(p => p).map(normalizePreviewDoc)
    // }

    return (
      <div className="Panel">
        {/* <div>{preview.title}</div>
        <div>
          {preview.sessionType}: {preview.draftPreview.title}(title),{' '}
          {preview.draftPreview.summary}(summary)
        </div>
        <pre>{JSON.stringify(preview)}</pre> */}
      </div>
    );
  }
}
