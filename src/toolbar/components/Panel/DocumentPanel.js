import { h, Component } from 'preact';
import { ellipsis } from 'common';
import { BasePanel, prismicSvg } from '.';
import { Icon } from '..';

export class DocumentPanel extends Component {
  constructor() {
    super(...arguments);
    this.state = { loading: true, documents: [] };
    this.props.prediction.documents.then(documents => this.setState({ documents, loading: false }));
  }

  render() {
    const { documents, loading } = this.state;
    if (!loading && !documents[0])
      return <BasePanel className="DocumentPanel">No Documents TODO</BasePanel>;
    return (
      <BasePanel className="DocumentPanel">
        <MainDocument doc={documents[0]} loading={loading} />
        <OtherDocuments documents={documents.slice(1)} loading={loading} />
      </BasePanel>
    );
  }
}

const MainDocument = ({ doc, loading }) => {
  if (loading) return 'loading main doc...';
  return (
    <div className="MainDocument top">
      <Icon src={prismicSvg} />

      <header>
        <h2>Edit your content in Prismic</h2>
        <h1>Main document</h1>
      </header>

      <a className="Document" href={doc.url} target="_blank">
        <header>
          <h3>{doc.title}</h3>
          <div className="label">{doc.status}Draft</div>
          {/* TODO several types of drafts */}
        </header>
        <div>{ellipsis(doc.summary, 300)}</div>
      </a>
    </div>
  );
};

const OtherDocuments = ({ documents, loading }) => {
  if (loading) return 'loading other docs...';
  return (
    <div className="OtherDocuments">
      <h2>Other documents</h2>
      <div>{documents.slice(0, 3).map(doc => <Document doc={doc} />)}</div>
      <div className="more">View more</div>
    </div>
  );
};

const Document = ({ doc }) => (
  <a className="Document" href={doc.url} target="_blank">
    <h3>{doc.title}</h3>
    <div>{ellipsis(doc.summary, 200)}</div>
  </a>
);
