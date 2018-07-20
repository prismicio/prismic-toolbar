import { h } from 'preact';
import { pencilSvg } from '.';
import { Icon, views } from '..';
import './Menu.css';

const { DOCS, NONE } = views;

export const Menu = ({ setPage, page }) => (
  <div className="Menu" onClick={() => setPage(page === DOCS ? NONE : DOCS) /* TODO */}>
    <Icon src={pencilSvg} />
  </div>
);
