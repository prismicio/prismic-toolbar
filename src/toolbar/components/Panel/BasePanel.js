import { h } from 'preact';

export const BasePanel = ({ children, className = '' }) => (
  <div className={`Panel ${className}`}>{children}</div>
);
