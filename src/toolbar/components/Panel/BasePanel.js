import { Animation } from '..';

export const BasePanel = ({ children, className = '' }) => (
  <Animation.SlideIn>
    <div className={`BasePanel ${className}`}>{children}</div>
  </Animation.SlideIn>
);
