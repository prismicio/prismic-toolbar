import { BasePanel, prismicWhiteSvg } from '.';
import { Icon } from '../Icon';
import { Loader } from '../Loader';
import { NavTabs, DevModeCollapsible } from '..';

export const DocumentPanel = ({ loading, documents, queries, onDocumentClick }) => {
  if (!documents.length) return null;


  return (
    <BasePanel className="DocumentPanel">
      <ToolbarHeader />
      { loading
        ? <Loader />
        : panelContent(documents, queries, onDocumentClick)
      }
    </BasePanel>
  );
};

const panelContent = (documents, queries, onDocumentClick) => {
  // If there is no docData then no queries was made, therefore we can't display the json.
  if (queries && queries.length > 0) {
    return (
      <NavTabs
        tabsName={['Edit Button', 'Dev Mode']}
        tabsContent={[
          <DocumentsSummaryTab documents={documents} onClick={onDocumentClick} />,
          <DevModeCollapsible queries={queries} />
        ]}
      />
    );
  }
  return (
    <DocumentsSummaryTab documents={documents} onClick={onDocumentClick} />
  );
};

const ToolbarHeader = () => (
  <div className="toolbar-header" >
    <div className="wrapper-icon" >
      <div className="background-icon" >
        <Icon src={prismicWhiteSvg} />
      </div>
    </div>

    <div className="wrapper-title" >
      <h2>Prismic Toolbar</h2>
      <h1>Document on this page</h1>
    </div>
  </div>
);

const DocumentsSummaryTab = ({ documents, onClick }) => {

  const mainDoc = documents[0];
  const otherDocs = documents.slice(1);

  return (
    <div className="documents-summary-tab">
      <h4 className="small-title" > Main Document </h4>
      <DocumentSummary document={mainDoc} isMain onClick={onClick} />
      {hasOtherDocs(otherDocs)}
      {
    otherDocs.map(document => <DocumentSummary document={document} onClick={onClick} />)
   }
    </div>
  );
};

const DocumentSummary = ({ document, isMain, onClick }) => (
  <a className="document-summary" href={document.editorUrl} target="_blank" onClick={e => {onClick({ isMain }); e.stopPropagation()}}>
    <div className="wrapper-title-status">
      <span className={document.status.toLowerCase()}>{document.status}</span>
      <h2>{document.title}</h2>
    </div>
    <p>{document.summary || 'Our goal at Prismic is to build the future of the CMS. All our improvements and features are based on the great'}</p>
  </a>
);

const hasOtherDocs = otherDocs => {
  if (otherDocs && otherDocs.length) { // check if array exist and has elements
    return (
      <h4 className="small-title" > Other Documents</h4>
    );
  }
};
