import { h } from 'preact';

export const BasePanel = ({ onClose, children }) => (
  <div className="Panel">
    <div onClick={onClose}>closePanel</div>
    {children}
  </div>
);
