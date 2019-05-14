import { BasePanel, xSvg } from '.';
import { Icon } from '..';

export const PreviewPanel = ({ onClose, preview }) => (
  <BasePanel className="PreviewPanel">
    <Icon className="x" src={xSvg} onClick={onClose} />
    <PreviewHeader title={preview.title} numberOfDocs={preview.documents.length} />
    <PreviewDocuments documents={preview.documents} />
  </BasePanel>
);

const PreviewHeader = ({ title, numberOfDocs }) => (
  <div className="Header top">
    <h2>{title}</h2>
    <h1>{numberOfDocs} document{numberOfDocs === 1 ? '' : 's'} to preview</h1>
  </div>
);

const PreviewDocuments = ({ documents }) => (
  <div className="Documents bottom">
    {documents.map((doc, i) => <PreviewDocument doc={doc} key={i} />)}
  </div>
);

const PreviewDocument = ({ doc }) => (
  <a className="Draft" href={doc.url} target="_blank">
    <h3>{doc.title}</h3>
    <div>{doc.summary}</div>
  </a>
);
