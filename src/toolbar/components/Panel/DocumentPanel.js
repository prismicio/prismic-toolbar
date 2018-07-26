import { h, Component } from 'preact';
import { ellipsis } from 'common';
import { BasePanel, prismicSvg } from '.';
import { Icon } from '..';

export class DocumentPanel extends Component {
  render() {
    const { documents } = this.props;
    if (!documents.length) return null;
    return (
      <BasePanel className="DocumentPanel">
        <MainDocument doc={documents[0]} />
        <OtherDocuments documents={documents.slice(1)} />
      </BasePanel>
    );
  }
}

const MainDocument = ({ doc }) => (
  <div className="MainDocument top">
    <Icon src={prismicSvg} />

    <header>
      <h2>Edit your content in Prismic</h2>
      <h1>Main document</h1>
    </header>

    <a className="Document" href={doc.url} target="_blank">
      <header>
        <h3>{doc.title}</h3>
      </header>
      <div>{ellipsis(doc.summary, 300)}</div>
    </a>
  </div>
);

const OtherDocuments = ({ documents }) => {
  if (!documents.length) return null;
  return (
    <div className="OtherDocuments bottom">
      <h2>Other documents</h2>
      <div>{documents.map(doc => <Document doc={doc} />)}</div>
    </div>
  );
};

const Document = ({ doc }) => (
  <a className="Document" href={doc.url} target="_blank">
    <h3>{doc.title}</h3>
    <div>{ellipsis(doc.summary, 200)}</div>
  </a>
);
