import './EditButton.css';
import { Component } from 'react';

/* ----- BEGINNING OF CLASS ----- */
export class EditButton extends Component {
  constructor (props) {
    super(props);
    this.state = { documents: props.documents, onClick: props.onClick };
  }

  splitDocuments(documents) {
    if (documents.length === 0) return [[], [], []];
    if (documents.length === 1) return [documents[0], [], []];

    return documents.slice(1).reduce(([main, others, links], doc) => {
      if (doc.isDocumentLink) return [main, others, links.concat([doc])];
      return [main, others.concat([doc]), links];
    }, [documents[0], [], []]);
  }

  /* ----- RENDER FUNCTION ----- */
  render() {
    const { documents, onClick } = this.state;
    const [mainDocument, otherDocuments, documentLinks] = this.splitDocuments(documents);

    return (
      <div className="documents-summary-tab">
        <h4 className="small-title">Main Document</h4>
        <DocumentSummary document={mainDocument} isMain onClick={onClick} />
        {BannerOtherDocs(otherDocuments)}
        {
          otherDocuments.map(document => <DocumentSummary document={document} onClick={onClick} />)
        }

        {BannerDocumentLinks(documentLinks)}
        {
          documentLinks.map(document => <DocumentSummary document={document} onClick={onClick} />)
        }
      </div>
    );
  }
}

const DocumentSummary = ({ document, isMain, onClick }) => (
  <a className="document-summary" href={document.editorUrl} target="_blank" onClick={() => onClick({ isMain })}>
    <div className="wrapper-title-status">
      <span className={document.status}>{document.status}</span>
      <h2>{document.title}</h2>
    </div>
    <p>{document.summary || 'Our goal at Prismic is to build the future of the CMS. All our improvements and features are based on the great'}</p>
  </a>
);

const BannerOtherDocs = otherDocs => {
  if (otherDocs && otherDocs.length) { // check if array exist and has elements
    return (
      <h4 className="small-title">Other Documents</h4>
    );
  }
};

const BannerDocumentLinks = documentLinks => {
  if (documentLinks && documentLinks.length) { // check if array exist and has elements
    return (
      <h4 className="small-title">Document Links</h4>
    );
  }
};
