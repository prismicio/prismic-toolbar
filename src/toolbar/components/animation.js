import { CSSTransition } from 'react-transition-group';

export const GrowIn = ({ children, in:inProp = true, ...other }) => (
  <CSSTransition
    in={inProp}
    timeout={300}
    classNames="growIn"
    unmountOnExit
    appear
    {...other}
  >
    {children}
  </CSSTransition>
)

export const SlideIn = ({ children, in:inProp = true, ...other }) => (
  <CSSTransition
    in={inProp}
    timeout={200}
    classNames="slideIn"
    unmountOnExit
    appear
    {...other}
  >
    {children}
  </CSSTransition>
)
