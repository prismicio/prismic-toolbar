import { ellipsis } from 'common';
import { BasePanel, prismicSvg } from '.';
import { Icon } from '..';

export const DocumentPanel = ({ documents, in:inProp, onDocumentClick }) => {
  if (!documents.length) return null;
  return (
    <BasePanel className="DocumentPanel" in={inProp}>
      <MainDocument doc={documents[0]} onClick={onDocumentClick} />
      <OtherDocuments documents={documents.slice(1)} onClick={onDocumentClick} />
    </BasePanel>
  );
}

const MainDocument = ({ doc, onClick }) => (
  <div className="MainDocument top">
    <Icon src={prismicSvg} />

    <header>
      <h2>Edit your content in Prismic</h2>
      <h1>Main document</h1>
    </header>

    <Document doc={doc} isMain onClick={onClick} />
  </div>
);

const OtherDocuments = ({ documents, onClick }) => {
  if (!documents.length) return null;
  return (
    <div className="OtherDocuments bottom">
      <h2>Other documents</h2>
      <div>{documents.map(doc => <Document doc={doc} onClick={onClick} />)}</div>
    </div>
  );
};

const Document = ({ doc, isMain, onClick }) => {
  const title = doc.title || 'Untitled Document';
  const summary = doc.summary || 'No summary available.';

  return (
    <a className="Document" href={doc.url} target="_blank" onClick={_ => onClick({ isMain })}>
      <header>
        <h3>{title}</h3>
        {doc.isDraft && <div className="label">Draft</div>}
      </header>
      <div>{ellipsis(summary, isMain ? 300 : 200)}</div>
    </a>
  );
};
