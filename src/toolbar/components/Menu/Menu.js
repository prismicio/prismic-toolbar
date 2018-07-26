import { h } from 'preact';
import { pencilSvg, xSvg } from '.';
import { Icon, views } from '..';

const { DOCS, NONE } = views;

export const Menu = ({ setPage, page }) => (
  <div className="Menu" onClick={() => setPage(page === DOCS ? NONE : DOCS) /* TODO */}>
    <Icon src={page === DOCS ? xSvg : pencilSvg} />
  </div>
);
