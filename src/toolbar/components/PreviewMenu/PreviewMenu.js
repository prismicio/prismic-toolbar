import { h } from 'preact';
import { Icon, views } from '..';
import { xSvg, linkSvg } from '.';
import './PreviewMenu.css';

const { DRAFTS, SHARE } = views;

export const PreviewMenu = ({ setPage, preview }) => (
  <div className="PreviewMenu">
    <div className="top">
      <h1>{preview.title}</h1>
      <div className="docs" onClick={() => setPage(DRAFTS)}>
        ({preview.documents.length} docs)
      </div>
    </div>

    <div className="share" onClick={() => setPage(SHARE)}>
      <span>Get a shareable link</span>
      <Icon className="link" src={linkSvg} />
    </div>

    <Icon className="x" src={xSvg} onClick={preview.end} />
  </div>
);
