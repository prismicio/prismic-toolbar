import { pencilSvg, xSvg } from '.';
import { Icon, views, Animation } from '..';

const { DOCS, NONE } = views;

export const Menu = ({ setPage, page, inProp }) => (
  <Animation.GrowIn inProp={inProp}>
    <div className="Menu" onClick={_ => setPage(page === DOCS ? NONE : DOCS)}>
      <Icon className={page === DOCS ? 'x' : 'pencil'} src={page === DOCS ? xSvg : pencilSvg} />
    </div>
  </Animation.GrowIn>
);
