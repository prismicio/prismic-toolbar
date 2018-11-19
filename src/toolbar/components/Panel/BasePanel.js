import { Animation } from '..';

export const BasePanel = ({ children, className = '', in:inProp }) => (
  <Animation.SlideIn in={inProp}>
    <div className={`BasePanel ${className}`}>{children}</div>
  </Animation.SlideIn>
);
