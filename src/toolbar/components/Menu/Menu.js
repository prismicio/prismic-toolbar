import { h } from 'preact';
import { views } from '..';
import './Menu.css';

const { DOCS, DRAFTS, SHARE } = views;

export const Menu = ({ setPage, preview }) => {
  if (preview.active)
    return (
      <div className="Menu-Preview">
        <div>
          <div>{preview.title}</div>
          <div className="docs" onClick={() => setPage(DRAFTS)}>
            {preview.documents.length} docs
          </div>
          <div className="share" onClick={() => setPage(SHARE)}>
            Get a shareable link
          </div>
        </div>
        <div onClick={preview.end}>x</div>
      </div>
    );

  return (
    <div className="Menu" onClick={() => setPage(DOCS)}>
      ✏
    </div>
  );
};
