import { h, Component } from 'preact';
import { switchy } from 'common';
import { views } from '..';
import { Document, Draft, Share } from '.';
import './Panel.css';

const { NONE, DOCS, DRAFTS, SHARE } = views;

// TODO maybe need more components to handle all pages
// TODO the pages state should be part of this component

export class Panel extends Component {
  constructor() {
    super(...arguments);
    this.state = { documents: null };
    this.props.prediction.documents.then(documents => this.setState({ documents }));
  }

  render() {
    const { setPage, prediction, preview, page } = this.props;
    const { documents, loading } = this.state;

    if (page === NONE) return null;

    return (
      <div className="Panel">
        <div onClick={_ => setPage(NONE)}>setPage(NONE)</div>
        {switchy(page)({
          [DOCS]: () => documents.map(doc => <Document doc={messenger} />),
          [DRAFTS]: () => drafts.map(draft => <Draft draft={draft} />),
          [SHARE]: () => <Share url={messenger.post('share', window.location)} />,
        })}
      </div>
    );
  }
}
