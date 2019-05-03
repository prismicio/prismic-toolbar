import React, { Fragment } from 'react';
import { ellipsis, switchy } from 'common';
import { BasePanel, prismicWhiteSvg } from '.';
import { Icon } from '..';
import ReactJson from 'react-json-view';
import { NavTabs } from '..';
import { DevModeCollapsible } from '..';

export const DocumentPanel = ({ documents, docData, onDocumentClick }) => {
  if (!documents.length) return null;
  return (
    <BasePanel className="DocumentPanel">
      <ToolbarHeader />
      <NavTabs
       tabsName={["Edit Button","Dev Mode"]}
       tabsContent={[
                    <DocumentsSummaryTab documents={documents} onClick={onDocumentClick} />,
                    <DevModeCollapsible docData={docData} />
                   ]}
      />
    </BasePanel>
  );
}

const ToolbarHeader = () => (
  <div className="toolbar-header">
    <div className="wrapper-icon">
      <div className="background-icon">
        <Icon src={prismicWhiteSvg} />
      </div>
    </div>

    <div className="wrapper-title">
     <h2>Prismic Toolbar</h2>
     <h1> Document on this page </h1>
    </div>
  </div>
);

const DocumentsSummaryTab = ({ documents, onClick}) => {
   const mainDoc = documents[0];
   const otherDocs = documents.slice(1);

  return(
  <div className="documents-summary-tab">
   <h4 className="small-title" > Main Document </h4>
   <DocumentSummary document={mainDoc} isMain onClick={onClick} />
   <h4 className="small-title" > Other Documents</h4>
   {otherDocs.map(document => <DocumentSummary document={document} /> )}
  </div>
  )

}

const DocumentSummary = ({ document, isMain, onClick }) => (
  <a className="document-summary" href={document.editorUrl} target="_blank" onClick={e=> onClick({ isMain })}>
    <div className="wrapper-title-status">
     <span className={document.status.toLowerCase()}>{document.status}</span>
     <h2>{document.title}</h2>
    </div>
    <p>{document.summary || "Our goal at Prismic is to build the future of the CMS. All our improvements and features are based on the great"}</p>
  </a>
)

const MainDocument = ({ doc, onClick }) => (
  <div className="MainDocument top">
    <Icon src={prismicWhiteSvg} />

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
  const data = doc.data || {'': 'Content not available right now'};

  return (
  <div>
    <a className="Document" href={doc.editorUrl} target="_blank" onClick={e => onClick({ isMain })}>
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
    <ReactJson
     src={data}
     name={null}
     iconStyle='square'
     collapsed={2}
     indentWidth={1}
     displayDataTypes={false}
     enableClipboard={false}
     displayObjectSize={false}
     collapseStringsAfterLength={15}
     theme={{
      // check --https://github.com/chriskempson/base16/blob/master/styling.md-- for info on how to build a theme
       base00: "white", // whole background
       base01: "#ddd",
       base02: "#ddd", // line on the left
       base03: "#444",
       base04: "purple",
       base05: "#444",
       base06: "#444",
       base07: "#444",
       base08: "#FF0000",
       base09: "rgba(70, 70, 230, 1)",
       base0A: "rgba(70, 70, 230, 1)",
       base0B: "rgba(70, 70, 230, 1)",
       base0C: "rgba(70, 70, 230, 1)",
       base0D: "#5163BA", // square on object open
       base0E: "#3F4A56", // square on object closed
       base0F: "rgba(70, 70, 230, 1)"
     }}
     />
    </div>

  );
};

