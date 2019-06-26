import './EditButton.css';
import { Component } from 'react';

/* ----- BEGINNING OF CLASS ----- */
export class EditButton extends Component {
  constructor (props) {
    super(props);
    this.state = { documents: props.documents, onClick: props.onClick };
  }

  /* ----- RENDER FUNCTION ----- */
  render() {
    const { documents, onClick } = this.state;
    const mainDoc = documents[0];
    const otherDocs = documents.slice(1);

    return (
      <div className="documents-summary-tab">
        <h4 className="small-title">Main Document</h4>
        <DocumentSummary document={mainDoc} isMain onClick={onClick} />
        {hasOtherDocs(otherDocs)}
        {
            otherDocs.map(document => <DocumentSummary document={document} onClick={onClick} />)
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

const hasOtherDocs = otherDocs => {
  if (otherDocs && otherDocs.length) { // check if array exist and has elements
    return (
      <h4 className="small-title">Other Documents</h4>
    );
  }
};
