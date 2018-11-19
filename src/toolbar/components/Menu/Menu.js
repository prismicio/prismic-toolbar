import { pencilSvg, xSvg } from '.';
import { Icon, views, Animation } from '..';

const { DOCS, NONE } = views;

export const Menu = ({ setPage, page, in:inProp }) => (
  <Animation.GrowIn in={inProp}>
    <div className="Menu" onClick={_ => setPage(page === DOCS ? NONE : DOCS)}>
      <Icon className={page === DOCS ? 'x' : 'pencil'} src={page === DOCS ? xSvg : pencilSvg} />
    </div>
  </Animation.GrowIn>
);
