import { h, Component } from 'preact';
import { switchy } from 'common';
import { views } from '..';
import { Document, Draft, Share } from '.';
import './Panel.css';

const { NONE, DOCS, DRAFTS, SHARE } = views;

export class Panel extends Component {
  render() {
    const { setPage, page, drafts, documents } = this.props;

    if (page === NONE) return null;

    return (
      <div className="Panel">
        <div onClick={_ => setPage(NONE)}>setPage(NONE)</div>
        {switchy(page)({
          [DOCS]: () => documents.map(doc => <Document doc={doc} />),
          [DRAFTS]: () => drafts.map(draft => <Draft draft={draft} />),
          [SHARE]: () => <Share />,
        })}
      </div>
    );
  }
}
