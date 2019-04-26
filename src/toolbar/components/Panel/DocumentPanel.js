import { ellipsis, switchy } from 'common';
import { BasePanel, prismicSvg } from '.';
import { Icon } from '..';
import ReactJson from 'react-json-view';
import { NavTabs } from '..';



export const DocumentPanel = ({ documents, onDocumentClick }) => {
  if (!documents.length) return null;
  return (
    <BasePanel className="DocumentPanel">
      <ToolbarHeader />
      <NavTabs tabsName={["Edit Button","Dev Mode"]} tabsContent={["Tab 1", "Tab 2"]} />
      <MainDocument doc={documents[0]} onClick={onDocumentClick} />
      <OtherDocuments documents={documents.slice(1)} onClick={onDocumentClick} />
    </BasePanel>
  );
}

const ToolbarHeader = () => (
  <div className="ToolbarHeader">
    <div className="WrapperIcon">
     <Icon src={prismicSvg} />
    </div>

    <div className="WrapperTitle">
     <h2>Prismic Toolbar</h2>
     <h1>Document on this page</h1>
    </div>
  </div>
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
    <a className="Document" href={doc.editorUrl} target="_blank" onClick={_ => onClick({ isMain })}>
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

