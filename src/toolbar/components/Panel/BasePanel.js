import { h } from 'preact';

export const BasePanel = ({ children, className = '' }) => (
  <div className={`BasePanel ${className}`}>{children}</div>
);
