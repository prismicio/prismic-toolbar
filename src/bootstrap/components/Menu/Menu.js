import { h, Component } from 'preact';
import { screenshot } from 'common';
import { views } from '..';
import './Menu.css';

const { DOCS, DRAFTS, SHARE } = views;

export const Menu = ({ setPage, preview }) => {
  if (preview.active)
    return (
      <div className="Menu-Preview">
        <div>
          <div>{preview.title}</div>
          <div className="docs" onClick={_ => setPage(DRAFTS)}>
            {preview.drafts.length} docs
          </div>
          <div className="share" onClick={preview.share}>
            Get a shareable link
          </div>
        </div>
        <div onClick={preview.close}>x</div>
      </div>
    );

  return (
    <div className="Menu" onClick={_ => setPage(DOCS)}>
      ✏
    </div>
  );
};
