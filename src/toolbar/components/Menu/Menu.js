import { h } from 'preact';
import { pencilSvg, xSvg } from '.';
import { Icon, views } from '..';

const { DOCS, NONE } = views;

export const Menu = ({ setPage, page }) => (
  <div className="Menu" onClick={() => setPage(page === DOCS ? NONE : DOCS)}>
    <Icon className={page === DOCS ? 'x' : 'pencil'} src={page === DOCS ? xSvg : pencilSvg} />
  </div>
);
