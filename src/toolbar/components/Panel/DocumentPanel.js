import { ellipsis, switchy } from '@common';
import { BasePanel, prismicSvg } from '.';
import { Icon } from '../Icon';
import { Loader } from '../Loader';
import React from 'react';

export const DocumentPanel = ({ loading, documents, onDocumentClick }) => {
  if (!documents.length) return null;
  const [mainDocument, otherDocuments, documentLinks] = (() => {
    if (documents.length === 0) return [[], [], []];
    if (documents.length === 1) return [documents[0], [], []];

    return documents.slice(1).reduce(([main, others, links], doc) => {
      if (doc.isDocumentLink) return [main, others, links.concat([doc])];
      return [main, others.concat([doc]), links];
    }, [documents[0], [], []]);
  })();
  return (
    <BasePanel className="DocumentPanel">
      { loading
        ? <Loader />
        : panelContent(mainDocument, otherDocuments, documentLinks, onDocumentClick)
      }
    </BasePanel>
  );
};

const panelContent = (mainDocument, otherDocuments, documentLinks, onDocumentClick) => (
  <React.Fragment>
    <MainDocument doc={mainDocument} onClick={onDocumentClick} />
    <OtherDocuments documents={otherDocuments} onClick={onDocumentClick} />
    <DocumentLinks documents={documentLinks} onClick={onDocumentClick} />
  </React.Fragment>
);

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

const DocumentLinks = ({ documents, onClick }) => {
  if (!documents.length) return null;
  return (
    <div className="document-links bottom">
      <h2>Documents Links</h2>
      <div>{documents.map(doc => <Document doc={doc} onClick={onClick} />)}</div>
    </div>
  );
};

const OtherDocuments = ({ documents, onClick }) => {
  if (!documents.length) return null;
  return (
    <div className="other-documents bottom">
      <h2>Other documents</h2>
      <div>{documents.map(doc => <Document doc={doc} onClick={onClick} />)}</div>
    </div>
  );
};

const Document = ({ doc, isMain, onClick }) => {
  const title = doc.title || 'Untitled Document';
  const summary = doc.summary || 'No summary available.';

  return (
    <a className="Document" href={doc.editorUrl} target="_blank" onClick={() => onClick({ isMain })}>
      <header>
        <h3>{title}</h3>
        {switchy(doc.status)({
          draft: <div className="label gold">Draft</div>,
          release: <div className="label navy">Release</div>,
          experiment: <div className="label gold">Experiment</div>,
          _: null,
        })}
      </header>
      <div>{ellipsis(summary, isMain ? 300 : 200)}</div>
    </a>
  );
};
