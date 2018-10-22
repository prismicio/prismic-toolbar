import { h } from 'preact';
import { Icon, views, ScrollingName } from '..';
import { xSvg, linkSvg } from '.';

const { DRAFTS, SHARE } = views;

export const PreviewMenu = ({ setPage, preview }) => {
  const len = preview.documents.length;
  return (
    <div className="PreviewMenu">
      <div className="top">
        <ScrollingName className='preview-title'>{preview.title}</ScrollingName>
        <div className="docs" onClick={() => setPage(DRAFTS)}>
          ({len} doc{len !== 1 ? 's' : ''})
        </div>
      </div>

      <div className="share" onClick={() => setPage(SHARE)}>
        <span>Get a shareable link</span>
        <Icon className="link" src={linkSvg} />
      </div>

      <Icon className="x" src={xSvg} onClick={preview.end} />
    </div>
  );
};
