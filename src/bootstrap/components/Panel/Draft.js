import { h } from 'preact';

export const Draft = ({ draft }) => (
  <div className="Draft">
    <div>{draft.title}</div>
    <div>{draft.summary}</div>
    <div>{draft.url}</div>
  </div>
);
