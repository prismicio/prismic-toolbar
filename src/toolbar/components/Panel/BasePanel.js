import { h } from 'preact';

export const BasePanel = ({ onClose, children, className = '' }) => (
  <div className={`Panel ${className}`}>
    {/* <div onClick={onClose}>closePanel</div> */}
    {children}
  </div>
);
