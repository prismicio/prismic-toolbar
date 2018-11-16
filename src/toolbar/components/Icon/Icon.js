export const Icon = ({ className = '', src, ...other }) => (
  <img className={`Icon ${className}`} src={src} alt="" {...other} />
);
