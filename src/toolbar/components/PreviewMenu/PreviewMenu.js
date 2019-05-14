import { Icon, views, ScrollingName, Animation } from '..';
import { xSvg, linkSvg } from '.';

const { DRAFTS, SHARE } = views;

export const PreviewMenu = ({ setPage, preview, in: inProp }) => {
  const len = preview.documents.length;
  return (
    <Animation.SlideIn in={inProp}>
      <div className="PreviewMenu">
        <div className="top">
          <ScrollingName className='preview-title'>{preview.title}</ScrollingName>
          {Boolean(len) && <div className="docs" onClick={_ => setPage(DRAFTS)}>
            ({len} doc{len !== 1 ? 's' : ''})
          </div>}
        </div>

        <div className="share" onClick={_ => setPage(SHARE)}>
          <span>Get a shareable link</span>
          <Icon className="link" src={linkSvg} />
        </div>

        <Icon className="x" src={xSvg} onClick={preview.end} />
      </div>
    </Animation.SlideIn>
  );
};
